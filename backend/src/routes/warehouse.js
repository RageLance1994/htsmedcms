import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";

const router = express.Router();

const getWarehouseDb = () => mongoose.connection.useDb("htstest", { useCache: true });

const normalizeWarehouseCode = (value) => String(value || "").trim();
const normalizeSerial = (value) => String(value || "").trim();
const parseBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["1", "true", "si", "sì", "yes", "y"].includes(v)) return true;
    if (["0", "false", "no", "n"].includes(v)) return false;
  }
  return fallback;
};

const SCAN_SESSION_TTL_MS = 10 * 60 * 1000;
const scanSessions = new Map();

const cleanupExpiredScanSessions = () => {
  const now = Date.now();
  for (const [id, session] of scanSessions.entries()) {
    if (!session || session.expiresAt <= now) {
      scanSessions.delete(id);
    }
  }
};

const normalizeOrigin = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
};

const getScanBaseUrl = (req) => {
  const envBase = normalizeOrigin(process.env.SCAN_MOBILE_BASE_URL);
  if (envBase) return envBase;
  const originHeader = normalizeOrigin(req.headers.origin);
  if (originHeader) return originHeader;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
};

const readResponseOutputText = (payload) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return "";
};

const normalizeExtractedSerial = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

const extractSerialFromImageWithOpenAI = async (imageDataUrl) => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
  }
  const model = String(process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini");
  const prompt =
    "Estrai il codice seriale principale dall'immagine. Rispondi SOLO JSON valido con la chiave seriale. Se non trovi alcun seriale usa stringa vuota.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageDataUrl }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "seriale_estratto",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              seriale: { type: "string" }
            },
            required: ["seriale"]
          },
          strict: true
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      payload?.error?.message || payload?.message || `Errore OpenAI (${response.status})`;
    throw new Error(msg);
  }

  let seriale = "";
  const outputText = readResponseOutputText(payload);
  if (outputText) {
    try {
      const parsed = JSON.parse(outputText);
      seriale = normalizeExtractedSerial(parsed?.seriale);
    } catch {
      seriale = normalizeExtractedSerial(outputText);
    }
  }
  if (!seriale) {
    throw new Error("Seriale non rilevato dall'immagine");
  }
  return seriale;
};

let ensureIndexesPromise = null;

const sameIndexKey = (a = {}, b = {}) => {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([k, v], idx) => {
    const [bk, bv] = bEntries[idx] || [];
    return bk === k && bv === v;
  });
};

const ensureCollectionIndexes = async (db, collectionName, indexSpecs) => {
  const collection = db.collection(collectionName);
  const existing = await collection.indexes();
  for (const spec of indexSpecs) {
    const alreadyExists = existing.some((idx) => sameIndexKey(idx.key, spec.key));
    if (!alreadyExists) {
      await collection.createIndex(spec.key, spec.options || {});
    }
  }
};

const buildWarehouseCacheRowsPipeline = (codes) => [
  { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
  { $match: { codiceTrim: { $in: codes } } },
  {
    $lookup: {
      from: "Movimenti di magazzino",
      let: { code: "$codiceTrim" },
      pipeline: [
        { $match: { $expr: { $eq: [{ $trim: { input: "$Cod_Articolo" } }, "$$code"] } } },
        {
          $lookup: {
            from: "Causali di magazzino",
            localField: "Cod_Causale",
            foreignField: "cod",
            as: "causale"
          }
        },
        { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            qty: "$QT movimentata",
            azFisica: "$causale.Azione su Giacenza Fisica",
            azFiscale: "$causale.Azione su Giacenza Fiscale"
          }
        },
        {
          $group: {
            _id: null,
            giacenzaFisica: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFisica", 0] }] }
            },
            giacenzaFiscale: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFiscale", 0] }] }
            }
          }
        }
      ],
      as: "movimentiAgg"
    }
  },
  {
    $addFields: {
      giacenzaFisica: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFisica", 0] }, 0] },
      giacenzaFiscale: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFiscale", 0] }, 0] }
    }
  },
  {
    $project: {
      _id: 0,
      codiceArticolo: "$codiceTrim",
      descrizione: "$Descrizione",
      unitaMisura: {
        $ifNull: [
          "$UnitÃƒÂ  di Misura",
          { $ifNull: ["$UnitÃ  di Misura", "$Unità di Misura"] }
        ]
      },
      giacenzaMinima: "$Giacenza Minina",
      alertGiacenza: "$Alert Giacenza",
      giacenzaFisica: 1,
      giacenzaFiscale: 1,
      obsoleto: "$Obsoleto"
    }
  }
];

const refreshWarehouseCacheByCodes = async (db, codes) => {
  const uniqueCodes = Array.from(new Set(codes.map(normalizeWarehouseCode).filter(Boolean)));
  if (uniqueCodes.length === 0) return;

  const rows = await db
    .collection("Codici_di_magazzino")
    .aggregate(buildWarehouseCacheRowsPipeline(uniqueCodes), { allowDiskUse: true })
    .toArray();

  if (rows.length === 0) return;

  const operations = rows.flatMap((row) => [
    {
      deleteMany: {
        filter: { codiceArticolo: row.codiceArticolo }
      }
    },
    {
      insertOne: {
        document: row
      }
    }
  ]);

  if (operations.length > 0) {
    await db.collection("warehouse_giacenze").bulkWrite(operations, { ordered: true });
  }
};

const getActiveSerialSet = async (db, pairs) => {
  const keys = pairs
    .map((pair) => ({
      codice: normalizeWarehouseCode(pair?.codiceArticolo),
      seriale: normalizeSerial(pair?.seriale)
    }))
    .filter((pair) => pair.codice && pair.seriale);
  if (keys.length === 0) return new Set();

  const codes = Array.from(new Set(keys.map((k) => k.codice)));
  const serials = Array.from(new Set(keys.map((k) => k.seriale)));

  const rows = await db
    .collection("Allocazione Magazzino")
    .aggregate([
      { $match: { cod_articolo: { $in: codes }, Seriale: { $in: serials } } },
      {
        $lookup: {
          from: "Movimenti di magazzino",
          localField: "cod_movimento",
          foreignField: "cod",
          as: "mov"
        }
      },
      { $unwind: { path: "$mov", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Causali di magazzino",
          localField: "mov.Cod_Causale",
          foreignField: "cod",
          as: "causale"
        }
      },
      { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          codice: "$cod_articolo",
          seriale: "$Seriale",
          azioneFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] },
          dataMovimento: "$mov.Data",
          codMov: "$mov.cod"
        }
      },
      { $sort: { codice: 1, seriale: 1, dataMovimento: -1, codMov: -1 } },
      {
        $group: {
          _id: { codice: "$codice", seriale: "$seriale" },
          azioneFisica: { $first: "$azioneFisica" }
        }
      },
      { $match: { azioneFisica: { $gt: 0 } } }
    ])
    .toArray();

  return new Set(rows.map((r) => `${r?._id?.codice}::${r?._id?.seriale}`));
};

const ensureIndexes = async () => {
  if (ensureIndexesPromise) return ensureIndexesPromise;
  const db = getWarehouseDb();
  ensureIndexesPromise = Promise.all([
    ensureCollectionIndexes(db, "warehouse_giacenze", [
      { key: { codiceArticolo: 1 } },
      { key: { descrizione: 1 } },
      { key: { giacenzaFisica: 1 } },
      { key: { giacenzaMinima: 1 } },
      { key: { alertGiacenza: 1 } }
    ]),
    ensureCollectionIndexes(db, "Codici_di_magazzino", [
      { key: { "Codice Articolo": 1 } },
      { key: { Descrizione: 1 } }
    ]),
    ensureCollectionIndexes(db, "Cli_For", [
      { key: { Tipo: 1, Nominativo: 1 } },
      { key: { Nominativo: 1 } },
      { key: { PIVA: 1 } }
    ]),
    ensureCollectionIndexes(db, "Causali di magazzino", [
      { key: { Nascondi: 1 } },
      { key: { "Azione su Giacenza Fisica": 1 } }
    ]),
    ensureCollectionIndexes(db, "Movimenti di magazzino", [
      { key: { Cod_Articolo: 1 } },
      { key: { Cod_Causale: 1 } },
      { key: { Data: -1 } }
    ]),
    ensureCollectionIndexes(db, "Allocazione Magazzino", [
      { key: { cod_movimento: 1 } },
      { key: { cod_articolo: 1 } },
      { key: { cod_articolo: 1, Seriale: 1 } }
    ])
  ]).catch((error) => {
    ensureIndexesPromise = null;
    throw error;
  });
  return ensureIndexesPromise;
};

const ensureIndexesInBackground = () => {
  ensureIndexes().catch((error) => {
    console.warn("Indice magazzino non inizializzato:", error.message);
  });
};
ensureIndexesInBackground();

router.get("/giacenze", async (req, res) => {
  try {
    ensureIndexesInBackground();

    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 5000);
    const onlyAlerts = String(req.query.alerts || "0") === "1";
    const sortBy = String(req.query.sortBy || "codiceArticolo").trim();
    const sortDirRaw = String(req.query.sortDir || "asc").toLowerCase();
    const sortDir = sortDirRaw === "desc" ? -1 : 1;
    const skip = (page - 1) * limit;

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { descrizione: re },
        { codiceArticolo: re },
        { Descrizione: re },
        { "Codice Articolo": re }
      ];
    }

    const query = { ...match };
    if (onlyAlerts) {
      query.$expr = { $lt: ["$giacenzaFisica", { $ifNull: ["$giacenzaMinima", 0] }] };
    }

    const sortableFields = new Set([
      "codiceArticolo",
      "descrizione",
      "giacenzaFiscale",
      "giacenzaFisica",
      "unitaMisura",
      "giacenzaMinima",
      "alert"
    ]);
    const sortField = sortableFields.has(sortBy) ? sortBy : "codiceArticolo";
    const sort = sortField === "alert" ? { giacenzaFisica: sortDir, giacenzaMinima: sortDir } : { [sortField]: sortDir };

    const [data, total] = await Promise.all([
      db
        .collection("warehouse_giacenze")
        .find(query, { projection: { _id: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("warehouse_giacenze").countDocuments(query)
    ]);

    res.json({ page, limit, total, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento giacenze", dettaglio: error.message });
  }
});

router.get("/giacenze/seriali", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const codice = String(req.query.codice || "").trim();
    if (!codice) {
      return res.status(400).json({ errore: "Codice articolo mancante" });
    }

    const pipeline = [
      { $match: { cod_articolo: codice } },
      {
        $lookup: {
          from: "Movimenti di magazzino",
          localField: "cod_movimento",
          foreignField: "cod",
          as: "mov"
        }
      },
      { $unwind: { path: "$mov", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Causali di magazzino",
          localField: "mov.Cod_Causale",
          foreignField: "cod",
          as: "causale"
        }
      },
      { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          codiceArticolo: "$cod_articolo",
          seriale: { $trim: { input: { $ifNull: ["$Seriale", ""] } } },
          dataMovimento: "$mov.Data",
          azioneFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] }
        }
      },
      { $match: { seriale: { $ne: "" } } },
      { $sort: { seriale: 1, dataMovimento: -1 } },
      {
        $group: {
          _id: "$seriale",
          codiceArticolo: { $first: "$codiceArticolo" },
          dataMovimento: { $first: "$dataMovimento" },
          azioneFisica: { $first: "$azioneFisica" }
        }
      },
      { $match: { azioneFisica: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          codiceArticolo: 1,
          seriale: "$_id",
          dataMovimento: 1
        }
      },
      { $sort: { dataMovimento: -1, seriale: 1 } }
    ];

    const rows = await db.collection("Allocazione Magazzino").aggregate(pipeline).toArray();
    const expected = await db.collection("warehouse_giacenze").findOne(
      { codiceArticolo: codice },
      { projection: { _id: 0, giacenzaFisica: 1 } }
    );
    const expectedQty = Math.max(Number(expected?.giacenzaFisica || 0), 0);
    const missing = Math.max(expectedQty - rows.length, 0);
    if (missing > 0) {
      for (let i = 0; i < missing; i += 1) {
        rows.push({
          codiceArticolo: codice,
          seriale: `NON ASSEGNATO ${i + 1}`,
          dataMovimento: null,
          placeholder: true
        });
      }
    }
    res.json({ codice, rows, expectedQty });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento seriali", dettaglio: error.message });
  }
});

router.get("/movimenti", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 500);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const codiceArticolo = normalizeWarehouseCode(req.query.codiceArticolo || "");
    const sortBy = String(req.query.sortBy || "data").trim();
    const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortMap = {
      data: "Data",
      codDdt: "Cod_DDT",
      codiceArticolo: "Cod_Articolo",
      descrizioneArticolo: "Cod_Articolo",
      descrizioneMovimento: "Cod_Causale",
      quantita: "QT movimentata",
      unitaMisura: "Unità di Misura",
      costoAcquisto: "Costo di Acquisto",
      depositoIniziale: "Cod_Causale",
      depositoFinale: "Cod_Causale",
      prezzoVendita: "Prezzo di Vendita",
      nominativo: "Riferimento",
      varFisica: "Cod_Causale",
      varFiscale: "Cod_Causale",
      partNumber: "Part Number",
      note: "Note",
      codMovimento: "cod"
    };
    const sortField = sortMap[sortBy] || "Data";
    const sortSpec = { [sortField]: sortDir, cod: sortDir };

    const match = {};
    if (codiceArticolo) {
      match.Cod_Articolo = codiceArticolo;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      const articleCodeRows = await db
        .collection("Codici_di_magazzino")
        .find({ Descrizione: re }, { projection: { _id: 0, "Codice Articolo": 1 } })
        .limit(2000)
        .toArray();
      const articleCodesFromDescription = Array.from(
        new Set(articleCodeRows.map((row) => normalizeWarehouseCode(row["Codice Articolo"])).filter(Boolean))
      );
      match.$or = [
        { Cod_Articolo: re },
        { Riferimento: re },
        { Note: re },
        { "Part Number": re },
        ...(articleCodesFromDescription.length > 0 ? [{ Cod_Articolo: { $in: articleCodesFromDescription } }] : [])
      ];
    }

    const [rows, total] = await Promise.all([
      db
        .collection("Movimenti di magazzino")
        .find(match, { projection: { _id: 0 } })
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("Movimenti di magazzino").countDocuments(match)
    ]);

    const causaliCodes = Array.from(new Set(rows.map((r) => Number(r.Cod_Causale)).filter(Number.isFinite)));
    const articleCodes = Array.from(new Set(rows.map((r) => normalizeWarehouseCode(r.Cod_Articolo)).filter(Boolean)));
    const movementCodes = Array.from(new Set(rows.map((r) => Number(r.cod)).filter(Number.isFinite)));

    const [causali, articoli, allocazioni, depositi] = await Promise.all([
      causaliCodes.length
        ? db
            .collection("Causali di magazzino")
            .find(
              { cod: { $in: causaliCodes } },
              {
                projection: {
                  _id: 0,
                  cod: 1,
                  "Descrizione Movimento": 1,
                  "Azione su Giacenza Fisica": 1,
                  "Azione su Giacenza Fiscale": 1,
                  "Deposito Iniziale": 1,
                  "Deposito Finale": 1
                }
              }
            )
            .toArray()
        : [],
      articleCodes.length
        ? db
            .collection("Codici_di_magazzino")
            .find(
              { "Codice Articolo": { $in: articleCodes } },
              { projection: { _id: 0, "Codice Articolo": 1, Descrizione: 1 } }
            )
            .toArray()
        : [],
      movementCodes.length
        ? db
            .collection("Allocazione Magazzino")
            .find({ cod_movimento: { $in: movementCodes } }, { projection: { _id: 0, cod_movimento: 1, Seriale: 1 } })
            .toArray()
        : [],
      db
        .collection("Depositi_Fiscali")
        .find({}, { projection: { _id: 0, Cod: 1, Descrizione: 1 } })
        .toArray()
    ]);

    const causaliMap = new Map(causali.map((row) => [Number(row.cod), row]));
    const articoliMap = new Map(articoli.map((row) => [normalizeWarehouseCode(row["Codice Articolo"]), String(row.Descrizione || "")]));
    const depositiMap = new Map(depositi.map((row) => [Number(row.Cod), String(row.Descrizione || "")]));
    const serialiMap = new Map();
    for (const row of allocazioni) {
      const movCode = Number(row.cod_movimento);
      const seriale = normalizeSerial(row.Seriale);
      if (!Number.isFinite(movCode) || !seriale) continue;
      const current = serialiMap.get(movCode) || [];
      if (!current.includes(seriale)) current.push(seriale);
      serialiMap.set(movCode, current);
    }

    const data = rows.map((row) => {
      const movCode = Number(row.cod);
      const seriali = serialiMap.get(movCode) || [];
      const causaleRow = causaliMap.get(Number(row.Cod_Causale)) || null;
      const depInizialeCod = Number(causaleRow?.["Deposito Iniziale"]);
      const depFinaleCod = Number(causaleRow?.["Deposito Finale"]);
      const unita =
        row["UnitÃƒÆ’Ã‚Â  di Misura"] ||
        row["UnitÃƒÂ  di Misura"] ||
        row["UnitÃ  di Misura"] ||
        row["UnitÃ  di misura"] ||
        "";
      return {
        codMovimento: movCode,
        data: row.Data || null,
        codDdt: Number(row.Cod_DDT || 0) || 0,
        codiceArticolo: normalizeWarehouseCode(row.Cod_Articolo),
        descrizioneArticolo:
          articoliMap.get(normalizeWarehouseCode(row.Cod_Articolo)) || String(row.Descrizione || "").trim(),
        descrizioneMovimento: String(causaleRow?.["Descrizione Movimento"] || ""),
        quantita: Number(row["QT movimentata"] || 0),
        unitaMisura: String(unita || "").trim(),
        seriale: seriali.join(", "),
        nominativo: String(row.Riferimento || ""),
        costoAcquisto: Number(row["Costo di Acquisto"] || 0),
        prezzoVendita: Number(row["Prezzo di Vendita"] || 0),
        depositoIniziale: depositiMap.get(depInizialeCod) || (Number.isFinite(depInizialeCod) ? String(depInizialeCod) : ""),
        depositoFinale: depositiMap.get(depFinaleCod) || (Number.isFinite(depFinaleCod) ? String(depFinaleCod) : ""),
        varFisica: Number(causaleRow?.["Azione su Giacenza Fisica"] || 0),
        varFiscale: Number(causaleRow?.["Azione su Giacenza Fiscale"] || 0),
        note: String(row.Note || ""),
        partNumber: String(row["Part Number"] || "")
      };
    });

    return res.json({ page, limit, total, data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento movimenti", dettaglio: error.message });
  }
});

router.get("/causali", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const tipo = String(req.query.tipo || "").toLowerCase();
    const soloNonNascoste = String(req.query.soloNonNascoste || "1") === "1";

    const match = {};
    if (soloNonNascoste) {
      match.Nascondi = { $ne: true };
    }
    if (tipo === "carico") {
      match["Azione su Giacenza Fisica"] = { $gt: 0 };
    }
    if (tipo === "scarico") {
      match["Azione su Giacenza Fisica"] = { $lt: 0 };
    }

    const [causali, depositi] = await Promise.all([
      db
        .collection("Causali di magazzino")
        .find(match, { projection: { _id: 0 } })
        .sort({ "Descrizione Movimento": 1 })
        .toArray(),
      db
        .collection("Depositi_Fiscali")
        .find({}, { projection: { _id: 0, Cod: 1, Descrizione: 1 } })
        .toArray()
    ]);

    const depositoMap = new Map(depositi.map((d) => [Number(d.Cod), d.Descrizione]));
    const data = causali.map((row) => {
      const depIniziale = Number(row["Deposito Iniziale"]);
      const depFinale = Number(row["Deposito Finale"]);
      return {
        cod: row.cod,
        descrizioneMovimento: row["Descrizione Movimento"],
        depositoIniziale: depIniziale,
        depositoFinale: depFinale,
        depositoInizialeNome: depositoMap.get(depIniziale) || String(depIniziale || "-"),
        depositoFinaleNome: depositoMap.get(depFinale) || String(depFinale || "-"),
        nascondi: row.Nascondi === true,
        note: row.Note || "",
        azioneFisica: row["Azione su Giacenza Fisica"] ?? 0,
        azioneFiscale: row["Azione su Giacenza Fiscale"] ?? 0
      };
    });

    res.json({ tipo, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento causali", dettaglio: error.message });
  }
});

router.get("/articoli", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 10), 2000);

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ "Codice Articolo": re }, { Descrizione: re }];
    }

    const rows = await db
      .collection("Codici_di_magazzino")
      .find(match, { projection: { _id: 0 } })
      .sort({ "Codice Articolo": 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      codiceArticolo: row["Codice Articolo"],
      descrizione: row.Descrizione || "",
      unitaMisura:
        row["UnitÃƒÂ  di Misura"] ||
        row["UnitÃ  di Misura"] ||
        row["UnitÃ  di misura"] ||
        row["Unità di Misura"] ||
        row["Unità di misura"] ||
        "",
      ammetteSeriale: row["Ammette Seriale"] === true,
      obsoleto: row.Obsoleto === true,
      costoAcquisto: row["Costo di Acquisto"] ?? null
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento articoli", dettaglio: error.message });
  }
});

router.get("/fornitori", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const tipo = String(req.query.tipo || "fornitori").toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "500", 10), 10), 5000);

    const match = {};
    if (tipo === "fornitori") {
      match.Tipo = /FORNITORE/i;
    } else if (tipo === "clienti") {
      match.Tipo = /CLIENTE/i;
    }
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ Nominativo: re }, { PIVA: re }];
    }

    const rows = await db
      .collection("Cli_For")
      .find(match, { projection: { _id: 0 } })
      .sort({ Nominativo: 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      cod: row.COD,
      nominativo: row.Nominativo || "",
      tipo: row.Tipo || "",
      piva: row.PIVA || "",
      indirizzo: row.Indirizzo || "",
      citta: row.Citta || "",
      cap: row.CAP || "",
      note: row.Note || "",
      agenziaRiferimento: row["Agenzia di Riferimento"] || row["Agenzia di riferimento"] || row["Agenzia Riferimento"] || ""
    }));

    res.json({ tipo, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento fornitori", dettaglio: error.message });
  }
});

router.get("/ddt", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "500", 10), 10), 2000);

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { "N DDT": re },
        { "Trasporto a mezzo": re },
        { "Indirizzo destinazione": re },
        { Note: re },
        { Note2: re }
      ];
    }

    const ddtRows = await db
      .collection("DDT")
      .find(match, {
        projection: {
          _id: 0,
          cod: 1,
          data: 1,
          "N DDT": 1,
          Cod_Cliente: 1,
          Cod_Causale: 1,
          "Indirizzo destinazione": 1,
          "Trasporto a mezzo": 1,
          Note: 1,
          Note2: 1
        }
      })
      .sort({ data: -1, cod: -1 })
      .limit(limit)
      .toArray();

    const clientiCodes = Array.from(new Set(ddtRows.map((r) => Number(r.Cod_Cliente)).filter(Number.isFinite)));
    const causaliCodes = Array.from(new Set(ddtRows.map((r) => Number(r.Cod_Causale)).filter(Number.isFinite)));

    const [clienti, causali] = await Promise.all([
      clientiCodes.length
        ? db
            .collection("Cli_For")
            .find({ COD: { $in: clientiCodes } }, { projection: { _id: 0, COD: 1, Nominativo: 1 } })
            .toArray()
        : [],
      causaliCodes.length
        ? db
            .collection("Causali di magazzino")
            .find({ cod: { $in: causaliCodes } }, { projection: { _id: 0, cod: 1, "Descrizione Movimento": 1 } })
            .toArray()
        : []
    ]);

    const clientiMap = new Map(clienti.map((c) => [Number(c.COD), String(c.Nominativo || "")]));
    const causaliMap = new Map(causali.map((c) => [Number(c.cod), String(c["Descrizione Movimento"] || "")]));

    const data = ddtRows.map((row) => {
      const cod = Number(row.cod);
      const noteInterne = [row.Note, row.Note2].filter(Boolean).join(" ").trim();
      return {
        cod,
        numeroDdt: String(row["N DDT"] || ""),
        data: row.data || null,
        codCliente: Number(row.Cod_Cliente || 0) || null,
        nominativo: clientiMap.get(Number(row.Cod_Cliente)) || "",
        indirizzoDestinazione: String(row["Indirizzo destinazione"] || ""),
        trasportoMezzo: String(row["Trasporto a mezzo"] || ""),
        descrizioneMovimento: causaliMap.get(Number(row.Cod_Causale)) || "",
        noteInterne,
        codCausale: Number(row.Cod_Causale || 0) || null
      };
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento DDT", dettaglio: error.message });
  }
});

router.get("/ddt/:cod", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const cod = Number(req.params.cod);
    if (!Number.isFinite(cod)) {
      return res.status(400).json({ errore: "Codice DDT non valido" });
    }

    const ddt = await db
      .collection("DDT")
      .findOne({ cod }, { projection: { _id: 0 } });
    if (!ddt) {
      return res.status(404).json({ errore: "DDT non trovato" });
    }

    const [cliente, causale, items] = await Promise.all([
      db.collection("Cli_For").findOne(
        { COD: Number(ddt.Cod_Cliente || 0) },
        { projection: { _id: 0, COD: 1, Nominativo: 1 } }
      ),
      db.collection("Causali di magazzino").findOne(
        { cod: Number(ddt.Cod_Causale || 0) },
        { projection: { _id: 0, cod: 1, "Descrizione Movimento": 1 } }
      ),
      db
        .collection("VociDDT_FM")
        .find({ Cod_DDT: cod }, { projection: { _id: 0 } })
        .sort({ cod: 1 })
        .toArray()
    ]);

    const articoli = items.map((item) => ({
      codiceArticolo: String(item["Codice Articolo"] || ""),
      quantita: Number(item["QT movimentata"] || 0),
      seriale: String(item.Seriale || "").trim(),
      descrizione: String(item.Descrizione || "")
    }));

    return res.json({
      dettaglio: {
        cod,
        numeroDdt: String(ddt["N DDT"] || ""),
        data: ddt.data || null,
        causale: String(causale?.["Descrizione Movimento"] || ""),
        nominativo: String(cliente?.Nominativo || ""),
        indirizzoDestinazione: String(ddt["Indirizzo destinazione"] || ""),
        trasportoMezzo: String(ddt["Trasporto a mezzo"] || ""),
        noteInterne: [ddt.Note, ddt.Note2].filter(Boolean).join(" ").trim(),
        articoli
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento dettaglio DDT", dettaglio: error.message });
  }
});

router.post("/articoli", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const payload = req.body || {};

    const codiceArticolo = normalizeWarehouseCode(payload.codiceArticolo || payload["Codice Articolo"]);
    const descrizione = String(payload.descrizione || payload.Descrizione || "").trim();
    const tipo = String(payload.tipo || payload.Tipo || "").trim().toUpperCase();
    const centroDiCosto = String(payload.centroDiCosto || payload["Centro di Costo"] || "").trim().toUpperCase();
    const unitaMisura = String(payload.unitaMisura || payload["Unità di Misura"] || payload["UnitÃ  di Misura"] || "QT")
      .trim()
      .toUpperCase();
    const marca = String(payload.marca || payload.Marca || "").trim();
    const valorizza = parseBool(payload.valorizza, false);
    const ammetteSeriale = parseBool(payload.ammetteSeriale, false);
    const prezzoVendita = payload.prezzoVendita !== undefined && payload.prezzoVendita !== null && payload.prezzoVendita !== ""
      ? Number(payload.prezzoVendita)
      : null;
    const costoAcquisto = payload.costoAcquisto !== undefined && payload.costoAcquisto !== null && payload.costoAcquisto !== ""
      ? Number(payload.costoAcquisto)
      : null;
    const partNumber = String(payload.partNumber || payload["Part Number"] || "").trim();
    const vendorCode = String(payload.vendorCode || payload["Vendor Code"] || "").trim();
    const alertGiacenza = parseBool(payload.alertGiacenza, false);
    const giacenzaMinima = payload.giacenzaMinima !== undefined && payload.giacenzaMinima !== null && payload.giacenzaMinima !== ""
      ? Number(payload.giacenzaMinima)
      : null;
    const obsoleto = parseBool(payload.obsoleto, false);
    const note = String(payload.note || payload.Note || "").trim();

    if (!codiceArticolo || !descrizione || !tipo || !centroDiCosto) {
      return res.status(400).json({ errore: "Campi obbligatori mancanti: codice, descrizione, tipo, centro di costo" });
    }
    if ((prezzoVendita !== null && !Number.isFinite(prezzoVendita)) || (costoAcquisto !== null && !Number.isFinite(costoAcquisto))) {
      return res.status(400).json({ errore: "Prezzo/Costo non validi" });
    }
    if (giacenzaMinima !== null && !Number.isFinite(giacenzaMinima)) {
      return res.status(400).json({ errore: "Giacenza minima non valida" });
    }

    const existing = await db.collection("Codici_di_magazzino").findOne(
      { "Codice Articolo": codiceArticolo },
      { projection: { _id: 0, "Codice Articolo": 1 } }
    );
    if (existing) {
      return res.status(409).json({ errore: `Articolo già presente: ${codiceArticolo}` });
    }

    const now = new Date();
    const doc = {
      "Codice Articolo": codiceArticolo,
      Descrizione: descrizione,
      Tipo: tipo,
      Marca: marca || null,
      "Centro di Costo": centroDiCosto,
      Valorizza: valorizza,
      "Ammette Seriale": ammetteSeriale,
      "Unità di Misura": unitaMisura,
      "UnitÃ  di Misura": unitaMisura,
      Note: note || null,
      "Costo di Acquisto": costoAcquisto,
      "Prezzo di Vendita": prezzoVendita,
      "Part Number": partNumber || null,
      "Vendor Code": vendorCode || null,
      "Alert Giacenza": alertGiacenza,
      "Giacenza Minina": giacenzaMinima,
      Obsoleto: obsoleto,
      LastEditDate: now,
      CreationDate: now
    };

    await db.collection("Codici_di_magazzino").insertOne(doc);

    res.status(201).json({
      ok: true,
      articolo: {
        codiceArticolo,
        descrizione,
        tipo,
        marca,
        centroDiCosto,
        valorizza,
        ammetteSeriale,
        unitaMisura,
        costoAcquisto,
        prezzoVendita,
        partNumber,
        vendorCode,
        alertGiacenza,
        giacenzaMinima,
        obsoleto,
        note
      }
    });
  } catch (error) {
    res.status(500).json({ errore: "Errore salvataggio articolo", dettaglio: error.message });
  }
});

router.post("/carico", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const { causale, dataMovimento, fornitore, items } = req.body || {};
    if (!causale || !dataMovimento || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errore: "Dati carico incompleti" });
    }

    const last = await db
      .collection("Movimenti di magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextCod = Number(last?.[0]?.cod || 0) + 1;

    const now = new Date();
    const date = new Date(dataMovimento);
    const normalizedItems = items.map((item, index) => {
      const qty = Number(item.quantita);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: minimo consentito 1`);
      }
      const articolo = item.articolo || {};
      const codiceArticolo = normalizeWarehouseCode(articolo.codiceArticolo || item.codiceArticolo);
      if (!codiceArticolo) {
        throw new Error(`Codice articolo mancante alla riga ${index + 1}`);
      }
      const seriale = normalizeSerial(item.seriale || item.seriali?.[0] || "");
      const ammetteSeriale = articolo?.ammetteSeriale === true;
      if (ammetteSeriale && !seriale) {
        throw new Error(`Seriale obbligatorio alla riga ${index + 1} per l'articolo ${codiceArticolo}`);
      }
      if (ammetteSeriale && qty !== 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: per articoli serializzati usare quantita 1`);
      }
      return {
        item,
        articolo,
        qty,
        codiceArticolo,
        seriale
      };
    });

    const seenInPayload = new Set();
    for (const [idx, row] of normalizedItems.entries()) {
      if (!row.seriale) continue;
      const key = `${row.codiceArticolo}::${row.seriale}`;
      if (seenInPayload.has(key)) {
        throw new Error(`Seriale duplicato nel carico (riga ${idx + 1}): ${row.seriale} per articolo ${row.codiceArticolo}`);
      }
      seenInPayload.add(key);
    }

    const activeSerialSet = await getActiveSerialSet(
      db,
      normalizedItems.map((row) => ({ codiceArticolo: row.codiceArticolo, seriale: row.seriale }))
    );
    for (const [idx, row] of normalizedItems.entries()) {
      if (!row.seriale) continue;
      const key = `${row.codiceArticolo}::${row.seriale}`;
      if (activeSerialSet.has(key)) {
        throw new Error(
          `Seriale gia presente in magazzino (riga ${idx + 1}): ${row.seriale} per articolo ${row.codiceArticolo}`
        );
      }
    }

    const docs = normalizedItems.map(({ item, articolo, qty, codiceArticolo }) => {
      return {
        Data: Number.isNaN(date.getTime()) ? now : date,
        Cod_Causale: Number(causale.cod),
        Cod_Articolo: codiceArticolo,
        "QT movimentata": qty,
        "Part Number": articolo.partNumber || item.partNumber || null,
        "Costo di Acquisto": articolo.costoAcquisto ?? null,
        "Prezzo di Vendita": null,
        Cod_DDT: null,
        Note: item.note || "",
        cod: nextCod++,
        cod_azienda: 1,
        cod_cliente: fornitore?.cod ?? null,
        Riferimento: fornitore?.nominativo || "",
        LastEditDate: now,
        CreationDate: now,
        Cod_Allegato: null,
        Cod_Allegato_Foto: null,
        "UnitÃƒÂ  di Misura": articolo.unitaMisura || null
      };
    });

    await db.collection("Movimenti di magazzino").insertMany(docs);

    const lastAlloc = await db
      .collection("Allocazione Magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextAllocCod = Number(lastAlloc?.[0]?.cod || 0) + 1;
    const deposito = Number(causale?.depositoFinale ?? causale?.depositoIniziale ?? 0);
    const allocazioni = normalizedItems.map(({ item, articolo, seriale }, index) => {
      return {
        cod_articolo: docs[index].Cod_Articolo,
        Seriale: seriale || null,
        Scaffale: String(item?.scaffale ?? articolo?.scaffale ?? ""),
        Riga: String(item?.riga ?? articolo?.riga ?? ""),
        Colonna: String(item?.colonna ?? articolo?.colonna ?? ""),
        Note: String(item?.note || ""),
        cod_movimento: docs[index].cod,
        cod: nextAllocCod++,
        Deposito: deposito
      };
    });
    if (allocazioni.length > 0) {
      await db.collection("Allocazione Magazzino").insertMany(allocazioni);
    }

    const codes = docs.map((doc) => doc.Cod_Articolo).filter(Boolean);
    await refreshWarehouseCacheByCodes(db, codes);

    res.json({ ok: true, inserted: docs.length, allocazioni: allocazioni.length });
  } catch (error) {
    res.status(500).json({ errore: "Errore salvataggio carico", dettaglio: error.message });
  }
});

router.post("/scan-sessions", (req, res) => {
  cleanupExpiredScanSessions();
  const id = crypto.randomUUID();
  const baseUrl = getScanBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({ errore: "Impossibile determinare l'URL base per la scansione mobile" });
  }
  const mobileUrl = `${baseUrl}/mobile-scan/${encodeURIComponent(id)}`;
  const now = Date.now();
  scanSessions.set(id, {
    id,
    status: "waiting",
    seriale: "",
    error: "",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + SCAN_SESSION_TTL_MS,
    context: String(req.body?.context || "")
  });
  return res.status(201).json({
    ok: true,
    sessionId: id,
    mobileUrl,
    expiresAt: new Date(now + SCAN_SESSION_TTL_MS).toISOString()
  });
});

router.get("/scan-sessions/:id", (req, res) => {
  cleanupExpiredScanSessions();
  const id = String(req.params.id || "");
  const session = scanSessions.get(id);
  if (!session) {
    return res.status(404).json({ errore: "Sessione di scansione non trovata o scaduta" });
  }
  return res.json({
    ok: true,
    sessionId: session.id,
    status: session.status,
    seriale: session.seriale || "",
    errore: session.error || "",
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString()
  });
});

router.delete("/scan-sessions/:id", (req, res) => {
  const id = String(req.params.id || "");
  scanSessions.delete(id);
  return res.json({ ok: true });
});

router.post("/scan-sessions/:id/scan", async (req, res) => {
  cleanupExpiredScanSessions();
  const id = String(req.params.id || "");
  const session = scanSessions.get(id);
  if (!session) {
    return res.status(404).json({ errore: "Sessione di scansione non trovata o scaduta" });
  }
  const imageDataUrl = String(req.body?.imageDataUrl || "");
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageDataUrl)) {
    return res.status(400).json({ errore: "Immagine non valida: usa un data URL base64" });
  }

  session.status = "processing";
  session.updatedAt = Date.now();
  session.error = "";
  session.seriale = "";

  try {
    const seriale = await extractSerialFromImageWithOpenAI(imageDataUrl);
    session.status = "ready";
    session.seriale = seriale;
    session.updatedAt = Date.now();
    scanSessions.set(id, session);
    return res.json({ ok: true, sessionId: id, status: "ready", seriale });
  } catch (error) {
    session.status = "error";
    session.error = error.message || "Errore estrazione seriale";
    session.updatedAt = Date.now();
    scanSessions.set(id, session);
    return res.status(500).json({ errore: "Errore analisi immagine", dettaglio: session.error });
  }
});

export default router;

