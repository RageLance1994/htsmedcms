import { MOCK_CLIENTI_FORNITORI } from "./mockClientiFornitori.js";
import { recordMatchesType } from "./types.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_CLIENTI_FORNITORI_MOCK_FALLBACK !== "0";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeRecord = (row) => ({
  cod: Number(row?.cod || 0),
  nominativo: String(row?.nominativo || "").trim(),
  tipo: String(row?.tipo || "altro").trim().toLowerCase(),
  tipoRaw: String(row?.tipoRaw || "").trim(),
  piva: String(row?.piva || "").trim(),
  codFiscale: String(row?.codFiscale || "").trim(),
  indirizzo: String(row?.indirizzo || "").trim(),
  citta: String(row?.citta || "").trim(),
  cap: String(row?.cap || "").trim(),
  provincia: String(row?.provincia || "").trim(),
  regione: String(row?.regione || "").trim(),
  telefoni: String(row?.telefoni || "").trim(),
  email: String(row?.email || "").trim(),
  pec: String(row?.pec || "").trim(),
  note: String(row?.note || "").trim(),
  agenziaRiferimento: String(row?.agenziaRiferimento || "").trim()
});

const toApiTipo = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "cliente") return "CLIENTE";
  if (raw === "fornitore") return "FORNITORE";
  if (raw === "cliente-fornitore") return "CLIENTE/FORNITORE";
  return String(value || "").trim().toUpperCase();
};

const normalizePayload = (payload = {}) => ({
  tipo: toApiTipo(payload.tipo),
  nominativo: String(payload.nominativo || "").trim(),
  piva: String(payload.piva || "").trim(),
  codFiscale: String(payload.codFiscale || "").trim(),
  indirizzo: String(payload.indirizzo || "").trim(),
  citta: String(payload.citta || "").trim(),
  cap: String(payload.cap || "").trim(),
  provincia: String(payload.provincia || "").trim().toUpperCase(),
  regione: String(payload.regione || "").trim(),
  telefoni: String(payload.telefoni || "").trim(),
  email: String(payload.email || "").trim(),
  pec: String(payload.pec || "").trim(),
  note: String(payload.note || "").trim(),
  agenziaRiferimento: String(payload.agenziaRiferimento || "").trim()
});

const extractApiError = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));
  const message = String(payload?.errore || payload?.dettaglio || fallbackMessage || "").trim();
  return message || fallbackMessage || "Errore richiesta";
};

const matchesSearch = (record, search) => {
  if (!search) return true;
  const needle = String(search || "").trim().toLowerCase();
  if (!needle) return true;
  const bag = [record.nominativo, record.piva, record.codFiscale, record.citta, record.email, record.pec]
    .join(" ")
    .toLowerCase();
  return bag.includes(needle);
};

const selectFromMock = ({ search, tipo, limit }) => {
  const normalized = MOCK_CLIENTI_FORNITORI.map(normalizeRecord)
    .filter((record) => recordMatchesType(record, tipo))
    .filter((record) => matchesSearch(record, search))
    .slice(0, limit);
  return {
    data: normalized,
    source: "mock",
    error: null
  };
};

export async function fetchClientiFornitori({ search = "", tipo = "all", limit = 250, signal } = {}) {
  const safeLimit = clamp(Number(limit) || 250, 10, 2000);
  const params = new URLSearchParams({
    search: String(search || "").trim(),
    tipo: String(tipo || "all").trim().toLowerCase(),
    limit: String(safeLimit)
  });

  try {
    const response = await fetch(`${API_BASE}/api/offerte/clienti-fornitori?${params.toString()}`, {
      method: "GET",
      signal
    });

    if (!response.ok) {
      throw new Error(`Errore caricamento anagrafiche (${response.status})`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data.map(normalizeRecord) : [];
    return {
      data,
      source: "api",
      error: null
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (!ENABLE_MOCK_FALLBACK) throw error;
    const fallback = selectFromMock({ search, tipo, limit: safeLimit });
    return {
      ...fallback,
      error: error instanceof Error ? error.message : "Fallback mock attivo"
    };
  }
}

export async function createClienteFornitore(payload, { signal } = {}) {
  const body = normalizePayload(payload);
  const response = await fetch(`${API_BASE}/api/warehouse/fornitori`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    throw new Error(await extractApiError(response, "Errore creazione anagrafica"));
  }
  const data = await response.json().catch(() => ({}));
  const record = normalizeRecord({
    ...(payload || {}),
    ...(data?.anagrafica || {}),
    cod: data?.anagrafica?.cod
  });
  return { ok: true, record };
}

export async function updateClienteFornitore(cod, payload, { signal } = {}) {
  const code = Number(cod);
  if (!Number.isFinite(code)) {
    throw new Error("Codice anagrafica non valido");
  }
  const body = normalizePayload(payload);
  const response = await fetch(`${API_BASE}/api/warehouse/fornitori/${encodeURIComponent(String(code))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    throw new Error(await extractApiError(response, "Errore modifica anagrafica"));
  }
  const data = await response.json().catch(() => ({}));
  const record = normalizeRecord({
    cod: code,
    ...(payload || {}),
    ...(data?.anagrafica || {})
  });
  return { ok: true, record };
}

export async function deleteClienteFornitore(cod, { signal } = {}) {
  const code = Number(cod);
  if (!Number.isFinite(code)) {
    throw new Error("Codice anagrafica non valido");
  }
  const response = await fetch(`${API_BASE}/api/warehouse/fornitori/${encodeURIComponent(String(code))}`, {
    method: "DELETE",
    signal
  });
  if (!response.ok) {
    throw new Error(await extractApiError(response, "Errore eliminazione anagrafica"));
  }
  return response.json().catch(() => ({ ok: true }));
}
