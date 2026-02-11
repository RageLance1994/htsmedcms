import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const getWarehouseDb = () => mongoose.connection.useDb("htstest", { useCache: true });

const ensureIndexes = async () => {
  const db = getWarehouseDb();
  await Promise.all([
    db.collection("warehouse_giacenze").createIndex({ codiceArticolo: 1 }),
    db.collection("warehouse_giacenze").createIndex({ descrizione: 1 }),
    db.collection("warehouse_giacenze").createIndex({ giacenzaFisica: 1 }),
    db.collection("warehouse_giacenze").createIndex({ giacenzaMinima: 1 }),
    db.collection("warehouse_giacenze").createIndex({ alertGiacenza: 1 })
  ]);
};

router.get("/giacenze", async (req, res) => {
  try {
    await ensureIndexes();

    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 5000);
    const onlyAlerts = String(req.query.alerts || "0") === "1";
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

    const [data, total] = await Promise.all([
      db
        .collection("warehouse_giacenze")
        .find(query, { projection: { _id: 0 } })
        .sort({ codiceArticolo: 1 })
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

router.get("/causali", async (req, res) => {
  try {
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
      unitaMisura: row["UnitÃ  di Misura"] || row["Unità di Misura"] || row["Unità di misura"] || "",
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
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 10), 2000);

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ Nominativo: re }, { PIVA: re }];
    }

    const rows = await db
      .collection("Anagrafica")
      .find(match, { projection: { _id: 0 } })
      .sort({ Nominativo: 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      cod: row.COD,
      nominativo: row.Nominativo || "",
      piva: row.PIVA || "",
      indirizzo: row.Indirizzo || "",
      citta: row.Citta || "",
      cap: row.CAP || "",
      note: row.note || "",
      agenziaRiferimento: row["Agenzia di Riferimento"] || row["Agenzia di riferimento"] || row["Agenzia Riferimento"] || ""
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento fornitori", dettaglio: error.message });
  }
});

router.post("/carico", async (req, res) => {
  try {
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
    const docs = items.map((item) => {
      const qty = Math.max(Number(item.quantita || 0), 0);
      const articolo = item.articolo || {};
      return {
        Data: Number.isNaN(date.getTime()) ? now : date,
        Cod_Causale: Number(causale.cod),
        Cod_Articolo: articolo.codiceArticolo || item.codiceArticolo,
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
        "UnitÃ  di Misura": articolo.unitaMisura || null
      };
    });

    await db.collection("Movimenti di magazzino").insertMany(docs);

    const codes = docs.map((doc) => doc.Cod_Articolo).filter(Boolean);
    if (codes.length) {
      const pipeline = [
        { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
        { $match: { codiceTrim: { $in: codes } } },
        {
          $lookup: {
            from: "Movimenti di magazzino",
            let: { code: "$codiceTrim" },
            pipeline: [
              { $match: { $expr: { $eq: ["$Cod_Articolo", "$$code"] } } },
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
            unitaMisura: "$UnitÃ  di Misura",
            giacenzaMinima: "$Giacenza Minina",
            alertGiacenza: "$Alert Giacenza",
            giacenzaFisica: 1,
            giacenzaFiscale: 1,
            obsoleto: "$Obsoleto"
          }
        },
        { $merge: { into: "warehouse_giacenze", whenMatched: "replace", whenNotMatched: "insert" } }
      ];
      await db.collection("Codici_di_magazzino").aggregate(pipeline, { allowDiskUse: true }).toArray();
    }

    res.json({ ok: true, inserted: docs.length });
  } catch (error) {
    res.status(500).json({ errore: "Errore salvataggio carico", dettaglio: error.message });
  }
});

export default router;
