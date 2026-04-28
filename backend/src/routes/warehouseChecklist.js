import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const WAREHOUSE_DB_NAME =
  String(process.env.WAREHOUSE_DB_NAME || "").trim() ||
  mongoose.connection?.db?.databaseName ||
  "htsmed";
const getWarehouseDb = () => mongoose.connection.useDb(WAREHOUSE_DB_NAME, { useCache: true });

const normalizeLooseKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const pickByAliases = (row, aliases = []) => {
  const direct = aliases
    .map((k) => row?.[k])
    .find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  if (direct !== undefined) return direct;
  const normalizedAliases = aliases.map(normalizeLooseKey);
  for (const [k, v] of Object.entries(row || {})) {
    if (v === undefined || v === null || String(v).trim() === "") continue;
    if (normalizedAliases.includes(normalizeLooseKey(k))) return v;
  }
  return undefined;
};

router.get("/checklist-interne", async (req, res) => {
  try {
    const db = getWarehouseDb();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 200);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const query = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { Protocollo: re },
        { "Modello Sistema": re },
        { Fornitore: re },
        { "S/N": re },
        { Note: re }
      ];
    }

    const [rows, total] = await Promise.all([
      db
        .collection("Check List Interna")
        .find(query, { projection: { _id: 0 } })
        .sort({ cod: -1, Protocollo: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("Check List Interna").countDocuments(query)
    ]);

    const data = rows.map((row) => ({
      cod: Number(row.cod || 0),
      protocollo: String(pickByAliases(row, ["Protocollo", "protocollo"]) || "").trim(),
      validato: String(pickByAliases(row, ["Validato", "validato"]) || "").trim().toUpperCase(),
      validatore: String(pickByAliases(row, ["Validatore", "validatore"]) || "").trim(),
      validoIl: pickByAliases(row, ["Valido il", "Valido_il", "dataValidazione"]) || null,
      dataInizio: pickByAliases(row, ["Data Inizio Check List", "Data Inizio", "dataInizio"]) || null,
      dataTermine: pickByAliases(row, ["Data Termine Check", "Data Termine", "dataTermine"]) || null,
      completata: String(pickByAliases(row, ["Completata", "completata"]) || "").trim().toUpperCase(),
      modelloSistema: String(pickByAliases(row, ["Modello Sistema", "modelloSistema"]) || "").trim(),
      seriale: String(pickByAliases(row, ["S/N", "Serial Number", "seriale"]) || "").trim(),
      conformeOrdine: String(pickByAliases(row, ["Conforme all'ordine", "Conforme ordine", "conformeOrdine"]) || "").trim().toUpperCase(),
      tecnicoEsecutore: String(pickByAliases(row, ["Tecnico Esecutore", "tecnicoEsecutore"]) || "").trim(),
      fornitore: String(pickByAliases(row, ["Fornitore", "fornitore"]) || "").trim(),
      dataCarico: pickByAliases(row, ["Data di Carico", "dataCarico"]) || null,
      noteCarico: String(pickByAliases(row, ["Note di Carico", "noteCarico"]) || "").trim(),
      codMovimento: Number(pickByAliases(row, ["cod_mov_maga", "codMovimento"]) || 0) || 0,
      numeroOrdine: String(pickByAliases(row, ["cod_ordine", "Numero Ordine", "N Ordine", "num_ordine"]) || "").trim()
    }));

    return res.json({ page, limit, total, data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento checklist", dettaglio: error.message });
  }
});

router.get("/checklist-interne/:cod/dettagli", async (req, res) => {
  try {
    const db = getWarehouseDb();
    const cod = Number(req.params.cod || 0);
    if (!Number.isFinite(cod) || cod <= 0) return res.json({ data: [] });

    const rows = await db
      .collection("Check List Interna Dettagli")
      .find({ cod_checklist: cod }, { projection: { _id: 0 } })
      .sort({ Progressivo: 1, progressivo: 1 })
      .toArray();

    const data = rows.map((row, idx) => ({
      progressivo: Number(pickByAliases(row, ["Progressivo", "progressivo"]) || idx + 1),
      voce: String(pickByAliases(row, ["Voce/Controllo", "Voce Controllo", "voce"]) || "").trim(),
      superato: String(pickByAliases(row, ["Superato", "superato"]) || "").trim().toUpperCase(),
      note: String(pickByAliases(row, ["Note", "note"]) || "").trim()
    }));

    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento dettagli checklist", dettaglio: error.message });
  }
});

router.get("/checklist-interne/templates", async (_req, res) => {
  try {
    const db = getWarehouseDb();
    const rows = await db
      .collection("Check Interna MASTER")
      .find({}, { projection: { _id: 0 } })
      .sort({ cod: 1 })
      .toArray();

    const data = rows.map((row) => ({
      cod: Number(row.cod || 0),
      modelloSistema: String(pickByAliases(row, ["Modello Sistema", "modelloSistema"]) || "").trim(),
      codAzienda: Number(pickByAliases(row, ["cod_azienda", "codAzienda"]) || 0) || 0
    }));

    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento template checklist", dettaglio: error.message });
  }
});

router.get("/checklist-interne/movimenti", async (req, res) => {
  try {
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "80", 10), 20), 200);

    const query = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ Riferimento: re }, { Cod_Articolo: re }, { Note: re }];
    }

    const rows = await db
      .collection("Movimenti di magazzino")
      .find(query, { projection: { _id: 0, cod: 1, Data: 1, Cod_DDT: 1, Riferimento: 1, Cod_Articolo: 1, Note: 1 } })
      .sort({ cod: -1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      codMovimento: Number(row.cod || 0) || 0,
      data: row.Data || null,
      numeroOrdine: String(row.Cod_DDT || "").trim(),
      fornitore: String(row.Riferimento || "").trim(),
      codiceArticolo: String(row.Cod_Articolo || "").trim(),
      note: String(row.Note || "").trim()
    }));

    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento movimenti checklist", dettaglio: error.message });
  }
});

export default router;
