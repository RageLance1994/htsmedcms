import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const STATUS_OPTIONS = ["ALL", "VALIDATO", "BOZZA"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0
  );

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
};

const normalizePreviewText = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (!raw.startsWith("{\\rtf")) return raw;
  let normalized = raw
    .replace(/\{\\(fonttbl|colortbl|stylesheet|info|pict|object|header|footer)[\s\S]*?\}/gi, " ")
    .replace(/\{\\\*\\[^{}]+[\s\S]*?\}/g, " ")
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, " ")
    .replace(/\\line/gi, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Remove common RTF header leftovers (font names / style catalog fragments).
  normalized = normalized
    .replace(/\b(?:Times New Roman|Calibri|Arial|Symbol|Courier New|Wingdings|Microsoft Sans Serif|List Paragraph)\b/gi, " ")
    .replace(/(?:^|\n)\s*(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 '.-]{1,40};\s*){3,}/g, "\n")
    .replace(/(?:^|\n)\s*(?:[;,:.\-o]\s*){8,}/gi, "\n")
    .replace(/\s*;\s*;\s*;\s*/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // If a meaningful label exists, drop leading noise before it.
  const anchors = ["Condizioni di Garanzia", "GARANZIA", "A)", "Art.", "Copertura"];
  for (const anchor of anchors) {
    const index = normalized.toLowerCase().indexOf(anchor.toLowerCase());
    if (index > 0) {
      normalized = normalized.slice(index).trim();
      break;
    }
  }

  return normalized || "-";
};

export default function OffertePage() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [years, setYears] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentYear = String(new Date().getFullYear());
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [center, setCenter] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [selectedCod, setSelectedCod] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [conditionsTab, setConditionsTab] = useState("fornitura");
  const listRequestAbortRef = useRef(null);

  const loadRows = async () => {
    if (listRequestAbortRef.current) {
      try {
        listRequestAbortRef.current.abort();
      } catch {
        // ignore
      }
    }
    const controller = new AbortController();
    listRequestAbortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const trimmedSearch = String(searchDebounced || "").trim();
      const isFastSearch = trimmedSearch.length > 0;
      const params = new URLSearchParams({
        year: String(year || currentYear),
        page: String(page),
        limit: String(limit),
        stato: status,
        centro: center,
        fast: "1"
      });
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      const res = await fetch(`${API_BASE}/api/offerte?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Errore caricamento offerte.");
      const payload = await res.json();

      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);
      setTotals((prev) => {
        const incoming = payload?.totals || null;
        if (!incoming) return null;
        if (!isFastSearch) return incoming;
        return {
          ...incoming,
          withContractCount:
            Number.isFinite(Number(prev?.withContractCount)) && Number(prev?.withContractCount) > 0
              ? Number(prev.withContractCount)
              : Number(incoming.withContractCount || 0)
        };
      });
      setYears(Array.isArray(payload?.years) ? payload.years : []);
      setCenters(Array.isArray(payload?.centriDiCosto) ? payload.centriDiCosto : []);

      if (data.length === 0) {
        setSelectedCod(null);
        return;
      }
      const stillExists = data.some((item) => String(item.cod) === String(selectedCod));
      if (!stillExists) {
        setSelectedCod(data[0].cod);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setRows([]);
      setTotals(null);
      setError(err.message || "Errore caricamento offerte.");
      setSelectedCod(null);
    } finally {
      if (listRequestAbortRef.current === controller) {
        listRequestAbortRef.current = null;
      }
      setLoading(false);
    }
  };

  const loadDetail = async (cod) => {
    if (!cod) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`${API_BASE}/api/offerte/${encodeURIComponent(String(cod))}`);
      if (!res.ok) throw new Error("Errore caricamento dettaglio offerta.");
      const payload = await res.json();
      setDetail(payload?.data || null);
    } catch (err) {
      setDetail(null);
      setDetailError(err.message || "Errore caricamento dettaglio offerta.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchDebounced(String(search || "").trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadRows();
  }, [year, page, limit, status, center, searchDebounced]);

  useEffect(() => {
    loadDetail(selectedCod);
  }, [selectedCod]);

  useEffect(() => {
    if (!detailModalOpen) return;
    const onEsc = (event) => {
      if (event.key === "Escape") setDetailModalOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [detailModalOpen]);

  const openDetailModal = (cod) => {
    if (!cod) return;
    setSelectedCod(cod);
    setConditionsTab("fornitura");
    setDetailModalOpen(true);
  };

  const conditionsText = useMemo(() => {
    if (!detail) return "-";
    if (conditionsTab === "garanzia") return normalizePreviewText(detail.garanzia);
    if (conditionsTab === "clausole") return normalizePreviewText(detail.clausoleContrattuali);
    return normalizePreviewText(detail.condizioniFornitura);
  }, [detail, conditionsTab]);

  const totalPages = useMemo(() => {
    const tot = Number(totals?.totalRows || 0);
    return Math.max(Math.ceil(tot / limit), 1);
  }, [totals, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <AppLayout
      fullscreen
      contextLabel="Produttivita"
      pageTitle="Offerte"
      brandContext="Commerciale"
      defaultOpenSection="PRODUTTIVITA"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Offerte</p>
          <p className="mt-1 text-xl font-semibold">{Number(totals?.totalRows || 0)}</p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Validate</p>
          <p className="mt-1 text-xl font-semibold text-emerald-500">{Number(totals?.validateCount || 0)}</p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Bozze</p>
          <p className="mt-1 text-xl font-semibold text-amber-500">{Number(totals?.bozzaCount || 0)}</p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Convertite in contratto</p>
          <p className="mt-1 text-xl font-semibold">{Number(totals?.withContractCount || 0)}</p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Imponibile</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(totals?.totaleImponibile || 0)}</p>
        </article>
      </section>

      <section className="warehouse-section flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="ui-control flex items-center px-2">
              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
                placeholder="Protocollo, cliente, oggetto, centro di costo"
                className="ml-3 h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="ui-select-wrap">
            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setPage(1);
              }}
              className="ui-control ui-select min-w-[108px] px-3 text-sm"
            >
              {[...new Set([currentYear, ...years])].map((item) => (
                <option key={item} value={item}>
                  Anno {item}
                </option>
              ))}
            </select>
            <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
          </div>

          <div className="ui-select-wrap">
            <select
              value={center}
              onChange={(event) => {
                setCenter(event.target.value);
                setPage(1);
              }}
              className="ui-control ui-select min-w-[132px] px-3 text-sm"
            >
              <option value="ALL">Tutti i centri</option>
              {centers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
          </div>

          <div className="ui-select-wrap">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="ui-control ui-select min-w-[124px] px-3 text-sm"
            >
              <option value="ALL">Tutti gli stati</option>
              {STATUS_OPTIONS.filter((item) => item !== "ALL").map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>
            Totale filtrato: <span className="text-[var(--page-fg)]">{Number(totals?.totalRows || 0)}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Righe</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number.parseInt(event.target.value, 10));
                setPage(1);
              }}
              className="ui-control-sm ui-select px-2 text-xs text-[var(--page-fg)]"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] shadow-sm transition hover:bg-[var(--hover)] disabled:opacity-50"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] shadow-sm transition hover:bg-[var(--hover)] disabled:opacity-50"
              aria-label="Pagina successiva"
            >
              <i className="fa-solid fa-caret-right" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-auto rounded-md border border-[var(--border)] lg:overflow-x-hidden">
          <table className="warehouse-table table-dense w-full min-w-[1100px] table-fixed text-xs lg:min-w-0">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[6%] px-3 py-2">Stato</th>
                <th className="w-[10%] px-3 py-2">Protocollo</th>
                <th className="w-[8%] px-3 py-2">Data</th>
                <th className="w-[14%] px-3 py-2">Cliente</th>
                <th className="w-[22%] px-3 py-2">Oggetto</th>
                <th className="w-[10%] px-3 py-2">Centro</th>
                <th className="w-[8%] px-3 py-2">Agenzia</th>
                <th className="w-[10%] px-3 py-2">Imponibile</th>
                <th className="w-[5%] px-3 py-2">Ctr</th>
                <th className="w-[5%] px-3 py-2">Fatt.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const validated = row.validato || row.stato === "VALIDATO";
                return (
                  <tr
                    key={row.cod}
                    className={`cursor-pointer border-t border-[var(--border)] ${validated ? "bg-lime-300/20" : ""}`}
                    onClick={() => openDetailModal(row.cod)}
                  >
                    <td className="px-3 py-2 font-semibold">
                      <span className={validated ? "text-emerald-500" : "text-amber-500"}>
                        {validated ? "VALIDATA" : "BOZZA"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-sky-400">{row.protocollo || "-"}</td>
                    <td className="px-3 py-2">{formatDate(row.data)}</td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={row.nominativo || ""}>
                        {row.nominativo || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={row.oggetto || ""}>
                        {row.oggetto || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.centroDiCosto || "-"}</td>
                    <td className="px-3 py-2">{row.agenzia || "-"}</td>
                    <td className="px-3 py-2">{formatCurrency(row.totale)}</td>
                    <td className="px-3 py-2">{row.contrattiCount || 0}</td>
                    <td className="px-3 py-2">{row.fattureRicorrentiCount || row.fattureCount || 0}</td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-xs text-[var(--muted)]">
                    Nessuna offerta trovata.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {detailModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/80 px-0 py-0 sm:px-4 sm:py-0"
          onMouseDown={() => setDetailModalOpen(false)}
        >
          <div
            className="flex h-[85dvh] max-h-[85dvh] w-full max-w-[1600px] min-h-0 flex-col overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:rounded-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Dettaglio Offerta</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {detail?.protocollo || `Offerta ${selectedCod || "-"}`}
                </h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setDetailModalOpen(false)}
                aria-label="Chiudi dettaglio"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {detailError ? <p className="text-sm text-rose-500">{detailError}</p> : null}
              {detailLoading ? <p className="text-sm text-[var(--muted)]">Caricamento dettaglio...</p> : null}
              {!detailLoading && !detail ? (
                <p className="text-sm text-[var(--muted)]">Dettaglio non disponibile.</p>
              ) : null}

              {detail ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="min-h-0 space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 lg:col-span-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Anagrafica</p>
                    <p className="text-sm">Cliente: <span className="font-semibold">{detail.nominativo || "-"}</span></p>
                    <p className="text-sm">Centro di costo: <span className="font-semibold">{detail.centroDiCosto || "-"}</span></p>
                    <p className="text-sm">Agenzia: <span className="font-semibold">{detail.agenzia || "-"}</span></p>
                    <p className="text-sm">Data: <span className="font-semibold">{formatDateTime(detail.data)}</span></p>
                    <p className="text-sm">Totale: <span className="font-semibold">{formatCurrency(detail.totale)}</span></p>
                  </div>

                  <div className="min-h-0 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 lg:col-span-1">
                    <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Condizioni</p>
                    <div className="mt-2 flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1">
                      <button
                        type="button"
                        onClick={() => setConditionsTab("fornitura")}
                        className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          conditionsTab === "fornitura" ? "bg-[var(--surface-strong)] text-[var(--page-fg)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        Fornitura
                      </button>
                      <button
                        type="button"
                        onClick={() => setConditionsTab("garanzia")}
                        className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          conditionsTab === "garanzia" ? "bg-[var(--surface-strong)] text-[var(--page-fg)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        Garanzia
                      </button>
                      <button
                        type="button"
                        onClick={() => setConditionsTab("clausole")}
                        className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          conditionsTab === "clausole" ? "bg-[var(--surface-strong)] text-[var(--page-fg)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        Clausole
                      </button>
                    </div>
                    <p className="mt-2 max-h-[310px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm">
                      {conditionsText}
                    </p>
                  </div>

                  <div className="rounded-md border border-[var(--border)] lg:col-span-3">
                    <div className="border-b border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                      Voci Offerta
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full min-w-[900px] table-fixed text-xs">
                        <thead className="sticky top-0 bg-[var(--surface)]">
                          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                            <th className="w-[12%] px-3 py-2">Codice</th>
                            <th className="w-[36%] px-3 py-2">Descrizione</th>
                            <th className="w-[8%] px-3 py-2">Qt</th>
                            <th className="w-[12%] px-3 py-2">Costo Unit.</th>
                            <th className="w-[8%] px-3 py-2">Sconto</th>
                            <th className="w-[12%] px-3 py-2">Subtotale</th>
                            <th className="w-[12%] px-3 py-2">Costo Acq.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.voci || []).map((item) => (
                            <tr key={item.cod} className="border-t border-[var(--border)]">
                              <td className="px-3 py-2">{item.codice || "-"}</td>
                              <td className="px-3 py-2">{item.descrizione || "-"}</td>
                              <td className="px-3 py-2">{item.quantita || 0}</td>
                              <td className="px-3 py-2">{formatCurrency(item.costoUnitario)}</td>
                              <td className="px-3 py-2">{Number(item.sconto || 0)}%</td>
                              <td className="px-3 py-2">{formatCurrency(item.subTotale)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.costoAcquisto)}</td>
                            </tr>
                          ))}
                          {(detail.voci || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-6 text-center text-[var(--muted)]">
                                Nessuna voce.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
