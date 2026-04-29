import { Router } from "express";
import mongoose from "mongoose";

const router = Router();
const OFFERS_COLLECTION_CANDIDATES = (
  process.env.OFFERS_COLLECTION_CANDIDATES || process.env.OFFERS_COLLECTION_NAME || "Offerte,Preventivi"
)
  .split(",")
  .map((item) => String(item || "").trim())
  .filter(Boolean);

const COLLECTIONS = {
  preventivi: OFFERS_COLLECTION_CANDIDATES[0] || "Offerte",
  clientiFornitori: "Cli_For",
  contratti: "Contratti",
  fattureEmesse: "Fatture_Emesse",
  scadenzeFattureEmesse: "Scadenze_Fatture_Emesse",
  vociPreventivo: "Voci_Preventivo",
  centriDiCosto: "Centri di Costo"
};

let offersCollectionCache = { expiresAt: 0, name: COLLECTIONS.preventivi };
const OFFERS_COLLECTION_CACHE_TTL_MS = 60 * 1000;

const resolveOffersCollectionName = async (db) => {
  if (offersCollectionCache.expiresAt > Date.now() && offersCollectionCache.name) {
    return offersCollectionCache.name;
  }
  let firstReachableCandidate = null;
  for (const candidate of OFFERS_COLLECTION_CANDIDATES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const count = await db.collection(candidate).estimatedDocumentCount();
      if (firstReachableCandidate === null) firstReachableCandidate = candidate;
      if (count > 0) {
        offersCollectionCache = { expiresAt: Date.now() + OFFERS_COLLECTION_CACHE_TTL_MS, name: candidate };
        return candidate;
      }
    } catch {
      // Ignore non-existing or inaccessible collections and continue probing.
    }
  }
  offersCollectionCache = {
    expiresAt: Date.now() + OFFERS_COLLECTION_CACHE_TTL_MS,
    name: firstReachableCandidate || OFFERS_COLLECTION_CANDIDATES[0] || COLLECTIONS.preventivi
  };
  return offersCollectionCache.name;
};

const OFFERS_DB_NAME =
  String(process.env.OFFERS_DB_NAME || "").trim() ||
  mongoose.connection?.db?.databaseName ||
  "htsmed";
const getDb = () => mongoose.connection.useDb(OFFERS_DB_NAME, { useCache: true });
const LIST_META_CACHE_TTL_MS = 5 * 60 * 1000;
let listMetaCache = {
  expiresAt: 0,
  years: [],
  centriDiCosto: []
};
const LIST_RESPONSE_CACHE_TTL_MS = Math.max(
  1000,
  Number.parseInt(String(process.env.OFFERS_LIST_CACHE_TTL_MS ?? "15000"), 10) || 15000
);
const SEARCH_CLIENT_CACHE_TTL_MS = Math.max(
  1000,
  Number.parseInt(String(process.env.OFFERS_SEARCH_CLIENT_CACHE_TTL_MS ?? "60000"), 10) || 60000
);
const LIST_RESPONSE_CACHE_MAX = Math.max(
  50,
  Number.parseInt(String(process.env.OFFERS_LIST_CACHE_MAX ?? "300"), 10) || 300
);
let listResponseCache = new Map();
let searchClientCache = new Map();
let withContractCountCache = {
  key: "",
  value: 0,
  expiresAt: 0,
  pending: false
};

const toFiniteInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
const normalizeCenter = (value) => String(value || "").trim().toUpperCase();
const nowMs = () => Date.now();

const getCacheEntry = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCacheEntry = (cache, key, value, ttlMs) => {
  cache.set(key, { value, expiresAt: nowMs() + ttlMs });
  if (cache.size <= LIST_RESPONSE_CACHE_MAX) return;
  // Trim expired first, then oldest insertion order entries.
  for (const [k, v] of cache.entries()) {
    if (v.expiresAt <= nowMs()) cache.delete(k);
  }
  while (cache.size > LIST_RESPONSE_CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
};

const getMatchingClientCodes = async (db, searchValue) => {
  const key = String(searchValue || "").toLowerCase();
  if (!key) return [];
  const cached = getCacheEntry(searchClientCache, key);
  if (cached) return cached;

  const rx = new RegExp(escapeRegex(searchValue), "i");
  const matchingClients = await db
    .collection(COLLECTIONS.clientiFornitori)
    .find({ Nominativo: rx }, { projection: { _id: 0, COD: 1 } })
    .limit(5000)
    .toArray();

  const codes = matchingClients
    .map((item) => Number(item?.COD))
    .filter((code) => Number.isFinite(code));

  setCacheEntry(searchClientCache, key, codes, SEARCH_CLIENT_CACHE_TTL_MS);
  return codes;
};

const refreshWithContractCount = async (db, offersCollection, baseMatch, cacheKey) => {
  if (withContractCountCache.pending && withContractCountCache.key === cacheKey) return;
  withContractCountCache.pending = true;
  try {
    const rows = await db
      .collection(offersCollection)
      .aggregate(
        [
          { $match: baseMatch },
          {
            $lookup: {
              from: COLLECTIONS.contratti,
              localField: "cod",
              foreignField: "cod_preventivo",
              pipeline: [{ $project: { _id: 0, cod: 1 } }],
              as: "c"
            }
          },
          { $match: { "c.0": { $exists: true } } },
          { $count: "count" }
        ],
        { maxTimeMS: 10000 }
      )
      .toArray();

    withContractCountCache = {
      key: cacheKey,
      value: Number(rows?.[0]?.count || 0),
      expiresAt: nowMs() + 120000,
      pending: false
    };
  } catch {
    withContractCountCache = {
      ...withContractCountCache,
      key: cacheKey,
      expiresAt: nowMs() + 30000,
      pending: false
    };
  }
};

const projectOfferRow = (row) => {
  const offertaData = toDateOrNull(row.data);
  const contrattiCount = Number(
    row.contrattiCount ??
      (Array.isArray(row.contratti) ? row.contratti.length : 0)
  );
  const fattureCount = Number(
    row.fattureCount ??
      (Array.isArray(row.fatture) ? row.fatture.length : 0)
  );
  const fattureRicorrentiCount = Number(
    row.fattureRicorrentiCount ??
      (Array.isArray(row.scadenze) ? row.scadenze.length : 0)
  );
  const scadenzeAperteCount = Number(
    row.scadenzeAperteCount ??
      (Array.isArray(row.scadenze) ? row.scadenze.filter((item) => item?.Pagata !== true).length : 0)
  );
  const prossimaScadenzaFromArray = Array.isArray(row.scadenze)
    ? row.scadenze
        .filter((item) => item?.Pagata !== true)
        .map((item) => toDateOrNull(item?.Scadenza))
        .filter(Boolean)
        .sort((a, b) => a - b)[0] || null
    : null;
  const prossimaScadenza = toDateOrNull(row.prossimaScadenza) || prossimaScadenzaFromArray;

  return {
    cod: Number(row.cod ?? 0),
    protocollo: String(row.protocollo || "").trim(),
    data: offertaData ? offertaData.toISOString() : null,
    oggetto: String(row.oggetto || "").trim(),
    descrizione: String(row.Descrizione || "").trim(),
    centroDiCosto: String(row["Centro di Costo"] || "").trim(),
    stato: normalizeStatus(row.stato),
    validato: row.validato === true,
    inviato: row.Inviato === true,
    ctrService: row.CTRservice === true,
    totale: Number(row.Totale || 0),
    codCliente: Number(row.Cod_Cliente || 0),
    codAzienda: Number(row.Cod_Azienda || 0),
    nominativo: String(row.cliente?.Nominativo || "").trim(),
    agenzia: String(row.cliente?.["Agenzia di Riferimento"] || "").trim(),
    hasContratto: contrattiCount > 0,
    contrattiCount,
    fattureCount,
    fattureRicorrentiCount,
    scadenzeAperteCount,
    prossimaScadenza: prossimaScadenza ? prossimaScadenza.toISOString() : null
  };
};

const normalizePartyType = (value) => {
  const text = String(value || "").toUpperCase();
  const hasCliente = text.includes("CLIENTE");
  const hasFornitore = text.includes("FORNITORE");
  if (hasCliente && hasFornitore) return "cliente-fornitore";
  if (hasCliente) return "cliente";
  if (hasFornitore) return "fornitore";
  return "altro";
};

router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const dbName = db?.databaseName || OFFERS_DB_NAME;
    const offersCollection = await resolveOffersCollectionName(db);

    const year = toFiniteInt(req.query.year, new Date().getFullYear());
    const page = clamp(toFiniteInt(req.query.page, 1), 1, 100000);
    const limit = clamp(toFiniteInt(req.query.limit, 100), 10, 500);
    const search = String(req.query.search || "").trim();
    const fastMode = String(req.query.fast ?? "1").trim() !== "0";
    const debugMode = String(req.query.debug || "").trim() === "1";
    const center = normalizeCenter(req.query.centro);
    const status = normalizeStatus(req.query.stato);
    const responseCacheKey = JSON.stringify({
      c: offersCollection,
      y: year,
      p: page,
      l: limit,
      s: search,
      ctr: center || "ALL",
      st: status || "ALL",
      f: fastMode ? 1 : 0
    });

    if (!debugMode) {
      const cachedPayload = getCacheEntry(listResponseCache, responseCacheKey);
      if (cachedPayload) {
        return res.json(cachedPayload);
      }
    }

    const baseMatch = {};

    if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
      baseMatch.protocollo = { $regex: `${escapeRegex(`-${year}`)}$`, $options: "i" };
    }
    if (center && center !== "ALL") {
      baseMatch["Centro di Costo"] = center;
    }
    if (status && status !== "ALL") {
      baseMatch.stato = status;
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const matchingClientCodes = await getMatchingClientCodes(db, search);

      const quickSearchMatch = [
        { protocollo: rx },
        { oggetto: rx },
        { "Centro di Costo": rx }
      ];
      if (matchingClientCodes.length > 0) {
        quickSearchMatch.push({ Cod_Cliente: { $in: matchingClientCodes } });
      }
      if (!fastMode) {
        quickSearchMatch.push({ Descrizione: rx });
      }
      baseMatch.$or = quickSearchMatch;
    }

    const metaCacheValid = listMetaCache.expiresAt > Date.now();
    const [rows, yearsRaw, centersMaster, centersUsed] = await Promise.all([
      db
      .collection(offersCollection)
      .aggregate(
        [
          { $match: baseMatch },
          {
            $facet: {
              data: [
                {
                  $addFields: {
                    __sortDate: {
                      $dateFromString: {
                        dateString: "$data",
                        onError: null,
                        onNull: null
                      }
                    }
                  }
                },
                { $sort: { __sortDate: -1, cod: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                  $project: {
                    protocollo: 1,
                    data: 1,
                    oggetto: 1,
                    "Centro di Costo": 1,
                    stato: 1,
                    validato: 1,
                    Inviato: 1,
                    CTRservice: 1,
                    Totale: 1,
                    Cod_Cliente: 1,
                    Cod_Azienda: 1,
                    cod: 1
                  }
                },
                {
                  $lookup: {
                    from: COLLECTIONS.clientiFornitori,
                    localField: "Cod_Cliente",
                    foreignField: "COD",
                    pipeline: [{ $project: { _id: 0, Nominativo: 1, "Agenzia di Riferimento": 1 } }],
                    as: "cliente"
                  }
                },
                { $unwind: { path: "$cliente", preserveNullAndEmptyArrays: true } },
                {
                  $lookup: {
                    from: COLLECTIONS.contratti,
                    localField: "cod",
                    foreignField: "cod_preventivo",
                    pipeline: [{ $project: { _id: 0, cod: 1 } }],
                    as: "contratti"
                  }
                },
                { $addFields: { contrattiCount: { $size: "$contratti" }, contractCods: "$contratti.cod" } },
                ...(fastMode
                  ? [
                      {
                        $addFields: {
                          fattureCount: 0,
                          fatturaCods: []
                        }
                      }
                    ]
                  : [
                      {
                        $lookup: {
                          from: COLLECTIONS.fattureEmesse,
                          let: { contractCods: "$contractCods" },
                          pipeline: [
                            { $match: { $expr: { $in: ["$Cod_Contratto", "$$contractCods"] } } },
                            { $project: { _id: 0, cod: 1 } }
                          ],
                          as: "fatture"
                        }
                      },
                      { $addFields: { fattureCount: { $size: "$fatture" }, fatturaCods: "$fatture.cod" } }
                    ]),
                ...(fastMode
                  ? [
                      {
                        $addFields: {
                          fattureRicorrentiCount: "$fattureCount",
                          scadenzeAperteCount: 0,
                          prossimaScadenza: null
                        }
                      }
                    ]
                  : [
                      {
                        $lookup: {
                          from: COLLECTIONS.scadenzeFattureEmesse,
                          let: { fatturaCods: "$fatturaCods" },
                          pipeline: [
                            { $match: { $expr: { $in: ["$Cod_fattura", "$$fatturaCods"] } } },
                            { $project: { _id: 0, Scadenza: 1, Pagata: 1 } }
                          ],
                          as: "scadenze"
                        }
                      },
                      {
                        $addFields: {
                          fattureRicorrentiCount: { $size: "$scadenze" },
                          scadenzeAperteCount: {
                            $size: {
                              $filter: {
                                input: "$scadenze",
                                as: "s",
                                cond: { $ne: ["$$s.Pagata", true] }
                              }
                            }
                          },
                          prossimaScadenza: {
                            $min: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$scadenze",
                                    as: "s",
                                    cond: { $ne: ["$$s.Pagata", true] }
                                  }
                                },
                                as: "u",
                                in: "$$u.Scadenza"
                              }
                            }
                          }
                        }
                      }
                    ]),
                {
                  $project: {
                    protocollo: 1,
                    data: 1,
                    oggetto: 1,
                    "Centro di Costo": 1,
                    stato: 1,
                    validato: 1,
                    Inviato: 1,
                    CTRservice: 1,
                    Totale: 1,
                    Cod_Cliente: 1,
                    Cod_Azienda: 1,
                    cod: 1,
                    cliente: {
                      Nominativo: "$cliente.Nominativo",
                      "Agenzia di Riferimento": "$cliente.Agenzia di Riferimento"
                    },
                    contrattiCount: 1,
                    fattureCount: 1,
                    fattureRicorrentiCount: 1,
                    scadenzeAperteCount: 1,
                    prossimaScadenza: 1
                  }
                }
              ],
              totals: [
                {
                  $group: {
                    _id: null,
                    totalRows: { $sum: 1 },
                    totaleImponibile: { $sum: { $ifNull: ["$Totale", 0] } },
                    validateCount: { $sum: { $cond: [{ $eq: ["$validato", true] }, 1, 0] } },
                    bozzaCount: { $sum: { $cond: [{ $eq: ["$stato", "BOZZA"] }, 1, 0] } }
                  }
                }
              ]
            }
          }
        ],
        { maxTimeMS: 15000 }
      )
      .toArray(),
      metaCacheValid
        ? Promise.resolve(null)
        : db
            .collection(offersCollection)
            .aggregate(
              [
                {
                  $project: {
                    year: {
                      $arrayElemAt: [{ $split: ["$protocollo", "-"] }, -1]
                    }
                  }
                },
                { $match: { year: { $regex: "^[0-9]{4}$" } } },
                { $group: { _id: "$year" } },
                { $sort: { _id: -1 } }
              ],
              { maxTimeMS: 10000 }
            )
            .toArray(),
      metaCacheValid
        ? Promise.resolve(null)
        : db
            .collection(COLLECTIONS.centriDiCosto)
            .find({}, { projection: { _id: 0, "Centro di Costo": 1 } })
            .toArray(),
      metaCacheValid
        ? Promise.resolve(null)
        : db
            .collection(offersCollection)
            .aggregate([{ $group: { _id: "$Centro di Costo" } }, { $sort: { _id: 1 } }], { maxTimeMS: 30000 })
            .toArray()
    ]);

    const payload = rows?.[0] || {};
    const data = Array.isArray(payload.data) ? payload.data.map(projectOfferRow) : [];
    const totals = payload.totals?.[0] || {};
    const contractCountCacheKey = `${offersCollection}:${JSON.stringify(baseMatch)}`;
    let withContractCount = withContractCountCache.value;
    if (!fastMode) {
      await refreshWithContractCount(db, offersCollection, baseMatch, contractCountCacheKey);
      withContractCount = withContractCountCache.value;
    } else {
      if (withContractCountCache.key !== contractCountCacheKey || withContractCountCache.expiresAt <= nowMs()) {
        refreshWithContractCount(db, offersCollection, baseMatch, contractCountCacheKey).catch(() => {});
      }
      if (withContractCountCache.key === contractCountCacheKey) {
        withContractCount = withContractCountCache.value;
      }
    }

    let years = listMetaCache.years;
    let centriDiCosto = listMetaCache.centriDiCosto;
    if (!metaCacheValid) {
      years = (yearsRaw || []).map((item) => item?._id).filter(Boolean);
      const masterCenters = (centersMaster || [])
        .map((item) => normalizeCenter(item?.["Centro di Costo"]))
        .filter(Boolean);
      const usedCenters = (centersUsed || []).map((item) => normalizeCenter(item?._id)).filter(Boolean);
      centriDiCosto = [...new Set([...masterCenters, ...usedCenters])].sort((a, b) => a.localeCompare(b, "it"));
      listMetaCache = {
        expiresAt: Date.now() + LIST_META_CACHE_TTL_MS,
        years,
        centriDiCosto
      };
    }

    const responsePayload = {
      ok: true,
      filtri: {
        year,
        page,
        limit,
        search,
        centro: center || "ALL",
        stato: status || "ALL"
      },
      totals: {
        totalRows: Number(totals.totalRows || 0),
        totaleImponibile: Number(totals.totaleImponibile || 0),
        validateCount: Number(totals.validateCount || 0),
        bozzaCount: Number(totals.bozzaCount || 0),
        withContractCount: Number(withContractCount || 0),
        withFattureCount: 0,
        fattureRicorrentiCount: 0
      },
      years,
      centriDiCosto,
      data
    };

    if (!debugMode) {
      setCacheEntry(listResponseCache, responseCacheKey, responsePayload, LIST_RESPONSE_CACHE_TTL_MS);
    } else {
      responsePayload.debug = {
        dbName,
        requestedDbName: OFFERS_DB_NAME,
        fastMode,
        offersCollection,
        offersCollectionCandidates: OFFERS_COLLECTION_CANDIDATES,
        collections: COLLECTIONS
      };
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error("[offerte/list] errore", error);
    const timeout =
      error?.code === 50 ||
      /exceeded time limit|maxtimems/i.test(String(error?.message || ""));
    return res
      .status(timeout ? 503 : 500)
      .json({ errore: timeout ? "Ricerca troppo pesante, riprova con filtri piu specifici." : "Errore durante il caricamento offerte." });
  }
});

router.get("/clienti-fornitori", async (req, res) => {
  try {
    const db = getDb();
    const search = String(req.query.search || "").trim();
    const requestedType = String(req.query.tipo || "all").trim().toLowerCase();
    const tipo = ["all", "cliente", "fornitore", "cliente-fornitore"].includes(requestedType) ? requestedType : "all";
    const limit = clamp(toFiniteInt(req.query.limit, 250), 10, 2000);

    const match = {};
    if (tipo === "cliente") {
      match.Tipo = /CLIENTE/i;
    } else if (tipo === "fornitore") {
      match.Tipo = /FORNITORE/i;
    } else if (tipo === "cliente-fornitore") {
      match.Tipo = /CLIENTE.*FORNITORE|FORNITORE.*CLIENTE/i;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      match.$or = [
        { Nominativo: rx },
        { PIVA: rx },
        { "Cod Fiscale": rx },
        { Citta: rx },
        { email1: rx },
        { PEC: rx }
      ];
    }

    const rows = await db
      .collection(COLLECTIONS.clientiFornitori)
      .find(match, {
        projection: {
          _id: 0,
          COD: 1,
          Nominativo: 1,
          Tipo: 1,
          PIVA: 1,
          "Cod Fiscale": 1,
          Indirizzo: 1,
          Citta: 1,
          CAP: 1,
          Provincia: 1,
          Regione: 1,
          telefoni: 1,
          email1: 1,
          PEC: 1,
          Note: 1,
          "Agenzia di Riferimento": 1,
          "Agenzia di riferimento": 1
        }
      })
      .sort({ Nominativo: 1, COD: 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      cod: Number(row.COD || 0),
      nominativo: String(row.Nominativo || "").trim(),
      tipo: normalizePartyType(row.Tipo),
      tipoRaw: String(row.Tipo || "").trim(),
      piva: String(row.PIVA || "").trim(),
      codFiscale: String(row["Cod Fiscale"] || "").trim(),
      indirizzo: String(row.Indirizzo || "").trim(),
      citta: String(row.Citta || "").trim(),
      cap: String(row.CAP || "").trim(),
      provincia: String(row.Provincia || "").trim(),
      regione: String(row.Regione || "").trim(),
      telefoni: String(row.telefoni || "").trim(),
      email: String(row.email1 || "").trim(),
      pec: String(row.PEC || "").trim(),
      note: String(row.Note || "").trim(),
      agenziaRiferimento: String(row["Agenzia di Riferimento"] || row["Agenzia di riferimento"] || "").trim()
    }));

    return res.json({
      ok: true,
      filters: {
        search,
        tipo,
        limit
      },
      total: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({
      errore: "Errore caricamento clienti/fornitori",
      dettaglio: error.message
    });
  }
});

router.get("/:cod", async (req, res) => {
  try {
    const db = getDb();
    const offersCollection = await resolveOffersCollectionName(db);
    const cod = toFiniteInt(req.params.cod, NaN);
    if (!Number.isFinite(cod)) {
      return res.status(400).json({ errore: "Codice offerta non valido." });
    }

    const [row] = await db
      .collection(offersCollection)
      .aggregate(
        [
          { $match: { cod } },
          {
            $lookup: {
              from: COLLECTIONS.clientiFornitori,
              localField: "Cod_Cliente",
              foreignField: "COD",
              as: "cliente"
            }
          },
          { $unwind: { path: "$cliente", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: COLLECTIONS.vociPreventivo,
              localField: "cod",
              foreignField: "Cod_Preventivo",
              as: "voci"
            }
          },
          {
            $lookup: {
              from: COLLECTIONS.contratti,
              let: { codPrev: "$cod" },
              pipeline: [
                { $match: { $expr: { $eq: ["$cod_preventivo", "$$codPrev"] } } },
                {
                  $project: {
                    _id: 0,
                    cod: 1,
                    protocollo: 1,
                    data: 1,
                    stato: 1,
                    validato: 1,
                    Perfezionato: 1,
                    "Fattura emessa": 1,
                    cod_preventivo: 1
                  }
                }
              ],
              as: "contratti"
            }
          },
          {
            $lookup: {
              from: COLLECTIONS.fattureEmesse,
              let: { codContratti: "$contratti.cod" },
              pipeline: [
                { $match: { $expr: { $in: ["$Cod_Contratto", "$$codContratti"] } } },
                {
                  $project: {
                    _id: 0,
                    cod: 1,
                    Protocollo: 1,
                    data: 1,
                    "TOTALE IMPONIBILE": 1,
                    "TOTALE GENERALE": 1,
                    Cod_Contratto: 1
                  }
                }
              ],
              as: "fatture"
            }
          },
          {
            $lookup: {
              from: COLLECTIONS.scadenzeFattureEmesse,
              let: { codFatture: "$fatture.cod" },
              pipeline: [
                { $match: { $expr: { $in: ["$Cod_fattura", "$$codFatture"] } } },
                {
                  $project: {
                    _id: 0,
                    cod: 1,
                    Cod_fattura: 1,
                    Scadenza: 1,
                    Importo: 1,
                    Pagata: 1
                  }
                }
              ],
              as: "scadenze"
            }
          }
        ],
        { maxTimeMS: 60000 }
      )
      .toArray();

    if (!row) {
      return res.status(404).json({ errore: "Offerta non trovata." });
    }

    const summary = projectOfferRow(row);
    const voci = Array.isArray(row.voci)
      ? row.voci.map((item) => ({
          cod: Number(item.Cod || 0),
          codice: String(item.Codice || "").trim(),
          descrizione: String(item.Descrizione || "").trim(),
          quantita: Number(item.QT || 0),
          costoUnitario: Number(item["Costo Unitario"] || 0),
          sconto: Number(item.Sconto || 0),
          subTotale: Number(item["Sub Totale"] || 0),
          costoAcquisto: Number(item["Costo di Acquisto"] || 0)
        }))
      : [];

    const fatture = Array.isArray(row.fatture)
      ? row.fatture.map((item) => ({
          cod: Number(item.cod || 0),
          protocollo: String(item.Protocollo || "").trim(),
          data: toDateOrNull(item.data)?.toISOString() || null,
          codContratto: Number(item.Cod_Contratto || 0),
          totaleImponibile: Number(item["TOTALE IMPONIBILE"] || 0),
          totaleGenerale: Number(item["TOTALE GENERALE"] || 0)
        }))
      : [];

    const scadenze = Array.isArray(row.scadenze)
      ? row.scadenze.map((item) => ({
          cod: Number(item.cod || 0),
          codFattura: Number(item.Cod_fattura || 0),
          scadenza: toDateOrNull(item.Scadenza)?.toISOString() || null,
          importo: Number(item.Importo || 0),
          pagata: item.Pagata === true
        }))
      : [];

    return res.json({
      ok: true,
      data: {
        ...summary,
        note: String(row.note || "").trim(),
        condizioniFornitura: String(row["Condizioni di Fornitura"] || "").trim(),
        clausoleContrattuali: String(row["Clausole contrattuali"] || "").trim(),
        garanzia: String(row.Garanzia || "").trim(),
        iva: Number(row.IVA || 0),
        voci,
        fatture,
        scadenze
      }
    });
  } catch (error) {
    console.error("[offerte/detail] errore", error);
    return res.status(500).json({ errore: "Errore durante il caricamento del dettaglio offerta." });
  }
});

export default router;
