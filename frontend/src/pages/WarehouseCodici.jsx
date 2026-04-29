import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ARTICLE_TYPE_OPTIONS = ["SERVIZIO", "RICAMBIO", "SISTEMA", "ATTREZZATURA/TOOLS"];
const COST_CENTER_OPTIONS = [
  "AMMINISTRAZIONE",
  "CDA",
  "COMMERCIALE",
  "INFRASTRUTTURE",
  "LABORATORIO",
  "NOLEGGIO OPERATIVO",
  "SEDE",
  "SERVICE ECO",
  "SERVICE RM",
  "SERVICE RX",
  "SERVICE TC",
  "VENDITA CT",
  "VENDITA ECO",
  "VENDITA RM",
  "VENDITA RX"
];
const UNIT_OPTIONS = ["QT", "LITRI", "KG", "ORE", "METRI"];

const getInitialNewArticleForm = () => ({
  descrizione: "",
  codiceArticolo: "",
  marca: "",
  tipo: ARTICLE_TYPE_OPTIONS[0],
  unitaMisura: UNIT_OPTIONS[0],
  centroDiCosto: COST_CENTER_OPTIONS[0],
  valorizza: false,
  ammetteSeriale: false,
  prezzoVendita: "",
  costoAcquisto: "",
  partNumber: "",
  vendorCode: "",
  alertGiacenza: false,
  giacenzaMinima: "",
  obsoleto: false,
  note: ""
});

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(num);
};

const normalizeNote = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (!raw.startsWith("{\\rtf")) return raw;
  return raw
    .replace(/\{\\(fonttbl|colortbl|stylesheet|info|pict|object|header|footer)[\s\S]*?\}/gi, " ")
    .replace(/\{\\\*\\[^{}]+[\s\S]*?\}/g, " ")
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, " ")
    .replace(/\\line/gi, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/(?:Calibri|Times New Roman|Default Paragraph Font|Line Number|Hyperlink|Normal Table|Table Simple 1|Normal)\s*;?/gi, " ")
    .replace(/\*+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

export default function WarehouseCodici() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [newArticleForm, setNewArticleForm] = useState(getInitialNewArticleForm());
  const [newArticleSaving, setNewArticleSaving] = useState(false);
  const [newArticleError, setNewArticleError] = useState("");

  const selected = useMemo(
    () => rows.find((row) => String(row.codiceArticolo) === String(selectedCode)) || null,
    [rows, selectedCode]
  );
  const total = rows.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page, limit]);

  const loadArticles = async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "2000", search: String(term || "").trim() });
      const res = await fetch(`${API_BASE}/api/warehouse/articoli?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento codici di magazzino");
      const payload = await res.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);
      setPage(1);
      if (data.length > 0) {
        const stillThere = data.some((row) => String(row.codiceArticolo) === String(selectedCode));
        if (!stillThere) setSelectedCode(String(data[0].codiceArticolo || ""));
      } else {
        setSelectedCode("");
      }
    } catch (err) {
      setError(err.message || "Errore caricamento codici di magazzino");
      setRows([]);
      setSelectedCode("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles("");
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setDetailsCollapsed(true);
    }
  }, []);

  const openNewArticle = () => {
    setNewArticleForm(getInitialNewArticleForm());
    setNewArticleError("");
    setNewArticleOpen(true);
  };

  const saveNewArticle = async () => {
    setNewArticleSaving(true);
    setNewArticleError("");
    try {
      const payload = {
        ...newArticleForm,
        codiceArticolo: String(newArticleForm.codiceArticolo || "").trim().toUpperCase(),
        descrizione: String(newArticleForm.descrizione || "").trim(),
        marca: String(newArticleForm.marca || "").trim(),
        partNumber: String(newArticleForm.partNumber || "").trim(),
        vendorCode: String(newArticleForm.vendorCode || "").trim(),
        note: String(newArticleForm.note || "").trim()
      };

      const res = await fetch(`${API_BASE}/api/warehouse/articoli`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.errore || "Errore salvataggio articolo");

      setNewArticleOpen(false);
      await loadArticles(search);
      if (payload.codiceArticolo) setSelectedCode(payload.codiceArticolo);
    } catch (err) {
      setNewArticleError(err.message || "Errore salvataggio articolo");
    } finally {
      setNewArticleSaving(false);
    }
  };

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino-Lab"
      pageTitle="Codici di Magazzino"
      brandContext="Warehouse"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="warehouse-section flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3">
              <button
                type="button"
                onClick={() => loadArticles(search)}
                disabled={loading}
                className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Aggiorna"
              >
                <i className={`fa-solid fa-rotate-right text-[12px] ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
              <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
              <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadArticles(search);
                }}
                placeholder="Codice articolo o descrizione"
                className="ml-3 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={openNewArticle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/15 text-lg font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
            aria-label="Nuovo codice"
            title="Nuovo codice"
          >
            +
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>
            Totale codici: <span className="text-[var(--page-fg)]">{rows.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs">Righe</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                setLimit(parseInt(event.target.value, 10));
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--page-fg)]"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-50"
              aria-label="Pagina precedente"
            >
              <i className="fa-solid fa-caret-left" aria-hidden="true" />
            </button>
            <span className="text-xs">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-50"
              aria-label="Pagina successiva"
            >
              <i className="fa-solid fa-caret-right" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <table className="warehouse-table table-dense w-full min-w-[1240px] table-fixed text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[11%] px-3 py-2">Codice</th>
                <th className="w-[20%] px-3 py-2">Descrizione</th>
                <th className="w-[8%] px-3 py-2">Tipo</th>
                <th className="w-[9%] px-3 py-2">Marca</th>
                <th className="w-[8%] px-3 py-2">Part Number</th>
                <th className="w-[8%] px-3 py-2">Vendor Code</th>
                <th className="w-[8%] px-3 py-2">Centro Costo</th>
                <th className="w-[6%] px-3 py-2">U.M.</th>
                <th className="w-[8%] px-3 py-2">Costo</th>
                <th className="w-[8%] px-3 py-2">Prezzo</th>
                <th className="w-[6%] px-3 py-2">Seriale</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const active = String(row.codiceArticolo) === String(selectedCode);
                return (
                  <tr
                    key={row.codiceArticolo}
                    className={`cursor-pointer border-t border-[var(--border)] ${active ? "bg-emerald-500/10" : ""}`}
                    onClick={() => setSelectedCode(String(row.codiceArticolo || ""))}
                  >
                    <td className="px-3 py-2 font-semibold text-sky-400">{row.codiceArticolo || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={row.descrizione || ""}>{row.descrizione || "-"}</span>
                    </td>
                    <td className="px-3 py-2">{row.tipo || "-"}</td>
                    <td className="px-3 py-2">{row.marca || "-"}</td>
                    <td className="px-3 py-2">{row.partNumber || "-"}</td>
                    <td className="px-3 py-2">{row.vendorCode || "-"}</td>
                    <td className="px-3 py-2">{row.centroDiCosto || "-"}</td>
                    <td className="px-3 py-2">{row.unitaMisura || "-"}</td>
                    <td className="px-3 py-2">{formatCurrency(row.costoAcquisto)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.prezzoVendita)}</td>
                    <td className="px-3 py-2">{row.ammetteSeriale ? "Si" : "No"}</td>
                  </tr>
                );
              })}
              {!loading && pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-xs text-[var(--muted)]">Nessun codice disponibile.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="relative py-1">
        <div className="h-[2px] w-full bg-[var(--border)]" />
        <button
          type="button"
          onClick={() => setDetailsCollapsed((prev) => !prev)}
          className="absolute left-1/2 top-1/2 inline-flex h-6 min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--muted)] hover:bg-[var(--hover)]"
          aria-expanded={!detailsCollapsed}
        >
          <i className={`fa-solid text-[11px] ${detailsCollapsed ? "fa-caret-down" : "fa-caret-up"}`} aria-hidden="true" />
        </button>
      </div>

      <section
        className={`min-w-0 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-[max-height,opacity] duration-300 ease-out ${
          detailsCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[42dvh] opacity-100"
        }`}
      >
        <div className="grid h-full min-h-0 gap-0 overflow-hidden lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Codice articolo</p>
                <p className="mt-1 text-sm font-semibold">{selected?.codiceArticolo || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Tipo</p>
                <p className="mt-1 text-sm font-semibold">{selected?.tipo || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Centro di costo</p>
                <p className="mt-1 text-sm font-semibold">{selected?.centroDiCosto || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Unita di misura</p>
                <p className="mt-1 text-sm font-semibold">{selected?.unitaMisura || "-"}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione</p>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold">{selected?.descrizione || "-"}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Marca</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.marca || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Part Number</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.partNumber || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Vendor Code</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.vendorCode || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Valorizza</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.valorizza ? "Si" : "No"}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Ammette seriale</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.ammetteSeriale ? "Si" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Obsoleto</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.obsoleto ? "Si" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Costo acquisto</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{formatCurrency(selected?.costoAcquisto)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Prezzo vendita</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{formatCurrency(selected?.prezzoVendita)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Alert giacenza</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.alertGiacenza ? "Attivo" : "Disattivo"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Soglia minima</p>
                <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.giacenzaMinima ?? "-"}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden p-4">
            <div className="flex h-full min-h-0 flex-col">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Note</p>
              <p className="mt-1 h-full min-h-[120px] overflow-hidden whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
                {normalizeNote(selected?.note)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {newArticleOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/80 px-3 py-3 sm:items-center sm:px-4 sm:py-8" onMouseDown={() => setNewArticleOpen(false)}>
          <div className="my-auto flex w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-4rem)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
              <h2 className="text-xl font-semibold">Nuovo Codice</h2>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]" onClick={() => setNewArticleOpen(false)} aria-label="Chiudi">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione</span>
                  <input type="text" value={newArticleForm.descrizione} onChange={(e) => setNewArticleForm((p) => ({ ...p, descrizione: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Codice articolo</span>
                  <input type="text" value={newArticleForm.codiceArticolo} onChange={(e) => setNewArticleForm((p) => ({ ...p, codiceArticolo: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Marca</span>
                  <input type="text" value={newArticleForm.marca} onChange={(e) => setNewArticleForm((p) => ({ ...p, marca: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Tipo</span>
                  <select value={newArticleForm.tipo} onChange={(e) => setNewArticleForm((p) => ({ ...p, tipo: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{ARTICLE_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Unita di misura</span>
                  <select value={newArticleForm.unitaMisura} onChange={(e) => setNewArticleForm((p) => ({ ...p, unitaMisura: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{UNIT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>
                </label>
                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Centro di costo</span>
                  <select value={newArticleForm.centroDiCosto} onChange={(e) => setNewArticleForm((p) => ({ ...p, centroDiCosto: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{COST_CENTER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Costo acquisto</span>
                  <input type="number" value={newArticleForm.costoAcquisto} onChange={(e) => setNewArticleForm((p) => ({ ...p, costoAcquisto: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Prezzo vendita</span>
                  <input type="number" value={newArticleForm.prezzoVendita} onChange={(e) => setNewArticleForm((p) => ({ ...p, prezzoVendita: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Part Number</span>
                  <input type="text" value={newArticleForm.partNumber} onChange={(e) => setNewArticleForm((p) => ({ ...p, partNumber: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Vendor Code</span>
                  <input type="text" value={newArticleForm.vendorCode} onChange={(e) => setNewArticleForm((p) => ({ ...p, vendorCode: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Note</span>
                  <textarea rows={3} value={newArticleForm.note} onChange={(e) => setNewArticleForm((p) => ({ ...p, note: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
                <div className="flex flex-wrap items-center gap-4 text-sm lg:col-span-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={newArticleForm.valorizza} onChange={(e) => setNewArticleForm((p) => ({ ...p, valorizza: e.target.checked }))} className="h-4 w-4" /><span>Valorizza</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={newArticleForm.ammetteSeriale} onChange={(e) => setNewArticleForm((p) => ({ ...p, ammetteSeriale: e.target.checked }))} className="h-4 w-4" /><span>Ammette seriale</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={newArticleForm.alertGiacenza} onChange={(e) => setNewArticleForm((p) => ({ ...p, alertGiacenza: e.target.checked }))} className="h-4 w-4" /><span>Alert giacenza</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={newArticleForm.obsoleto} onChange={(e) => setNewArticleForm((p) => ({ ...p, obsoleto: e.target.checked }))} className="h-4 w-4" /><span>Obsoleto</span></label>
                </div>
                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Soglia alert</span>
                  <input type="number" value={newArticleForm.giacenzaMinima} onChange={(e) => setNewArticleForm((p) => ({ ...p, giacenzaMinima: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </label>
              </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4">
              <button type="button" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm" onClick={() => setNewArticleOpen(false)}>Chiudi</button>
              <button type="button" onClick={saveNewArticle} disabled={newArticleSaving} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{newArticleSaving ? "Salvataggio..." : "Salva"}</button>
            </div>
            {newArticleError ? <p className="px-4 pb-4 text-sm text-rose-500 sm:px-6">{newArticleError}</p> : null}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
