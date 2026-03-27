import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import ContextMenu from "../components/ui/ContextMenu.jsx";
import useDebouncedCallback from "../hooks/useDebouncedCallback.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("it-IT");
};

const getMovementColorClass = (value) => {
  const text = String(value || "").toUpperCase();
  if (text.includes("VENDITA A CLIENTE")) return "text-emerald-400";
  if (text.includes("VISIONE A CLIENTE")) return "text-sky-400";
  if (text.includes("SOSTITUZIONE AL CLIENTE")) return "text-amber-400";
  if (text.includes("RESO")) return "text-cyan-400";
  if (text.includes("SCARICO")) return "text-rose-400";
  return "text-[var(--page-fg)]";
};

export default function WarehouseDdt() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCod, setSelectedCod] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [flagOnly, setFlagOnly] = useState(false);
  const [rowMenu, setRowMenu] = useState({ open: false, x: 0, y: 0, row: null });
  const [attachmentsByCod, setAttachmentsByCod] = useState({});
  const uploadInputRef = useRef(null);
  const pendingUploadCodRef = useRef(null);
  const [debouncedSearchUpdate, cancelDebouncedSearchUpdate] = useDebouncedCallback(
    (next) => setDebouncedSearch(String(next || "").trim()),
    168
  );

  const selectedRow = useMemo(
    () => rows.find((row) => Number(row.cod) === Number(selectedCod)) || null,
    [rows, selectedCod]
  );
  const total = rows.length;
  const effectiveLimit = limit === "all" ? Math.max(total, 1) : limit;
  const totalPages = Math.max(Math.ceil(total / effectiveLimit), 1);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * effectiveLimit;
    return rows.slice(start, start + effectiveLimit);
  }, [rows, page, effectiveLimit]);

  const loadDdtList = async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "1500",
        search: String(term || "").trim()
      });
      const res = await fetch(`${API_BASE}/api/warehouse/ddt?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento elenco DDT");
      const payload = await res.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);
      if (data.length > 0) {
        const selectedStillPresent = data.some((row) => Number(row.cod) === Number(selectedCod));
        if (!selectedStillPresent) {
          setSelectedCod(Number(data[0].cod));
        }
      } else {
        setSelectedCod(null);
      }
    } catch (err) {
      setError(err.message || "Errore caricamento elenco DDT");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (cod) => {
    if (!Number.isFinite(Number(cod))) {
      setDetails(null);
      return;
    }
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/ddt/${encodeURIComponent(String(cod))}`);
      if (!res.ok) throw new Error("Errore caricamento dettagli DDT");
      const payload = await res.json();
      setDetails(payload?.dettaglio || null);
    } catch {
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadDdtList("");
  }, []);

  useEffect(() => {
    if (selectedCod) {
      loadDetails(selectedCod);
    }
  }, [selectedCod]);

  useEffect(() => {
    debouncedSearchUpdate(search);
  }, [search, debouncedSearchUpdate]);

  useEffect(() => {
    loadDdtList(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const closeMenu = () => setRowMenu({ open: false, x: 0, y: 0, row: null });
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    document.addEventListener("mousedown", closeMenu);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  useEffect(() => {
    return () => {
      cancelDebouncedSearchUpdate();
      Object.values(attachmentsByCod).forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [attachmentsByCod, cancelDebouncedSearchUpdate]);

  const openRowMenu = (event, row) => {
    event.preventDefault();
    event.stopPropagation();
    const cod = Number(row?.cod);
    setSelectedCod(cod);
    setDetails({
      cod,
      numeroDdt: row?.numeroDdt || "",
      data: row?.data || null,
      causale: row?.descrizioneMovimento || "",
      nominativo: row?.nominativo || "",
      indirizzoDestinazione: row?.indirizzoDestinazione || "",
      trasportoMezzo: row?.trasportoMezzo || "",
      noteInterne: row?.noteInterne || "",
      articoli: []
    });
    if (Number.isFinite(cod)) {
      loadDetails(cod);
    }
    setRowMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      row
    });
  };

  const closeRowMenu = () => setRowMenu({ open: false, x: 0, y: 0, row: null });

  const handleViewAttachment = () => {
    const cod = Number(rowMenu?.row?.cod);
    const attachment = attachmentsByCod[cod];
    if (attachment?.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      closeRowMenu();
      return;
    }
    setError("Nessun allegato disponibile per questo DDT.");
    closeRowMenu();
  };

  const handleUploadAttachment = () => {
    const cod = Number(rowMenu?.row?.cod);
    if (!Number.isFinite(cod)) return;
    pendingUploadCodRef.current = cod;
    uploadInputRef.current?.click();
    closeRowMenu();
  };

  const handleDeleteAttachment = () => {
    const cod = Number(rowMenu?.row?.cod);
    if (!Number.isFinite(cod)) return;
    setAttachmentsByCod((prev) => {
      const current = prev[cod];
      if (current?.url) URL.revokeObjectURL(current.url);
      const next = { ...prev };
      delete next[cod];
      return next;
    });
    closeRowMenu();
  };

  const handleAttachmentFileSelection = (event) => {
    const file = event.target.files?.[0];
    const cod = Number(pendingUploadCodRef.current);
    if (!file || !Number.isFinite(cod)) {
      event.target.value = "";
      pendingUploadCodRef.current = null;
      return;
    }
    const url = URL.createObjectURL(file);
    setAttachmentsByCod((prev) => {
      const current = prev[cod];
      if (current?.url) URL.revokeObjectURL(current.url);
      return {
        ...prev,
        [cod]: {
          name: file.name,
          url
        }
      };
    });
    event.target.value = "";
    pendingUploadCodRef.current = null;
  };

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino-Lab"
      pageTitle="Elenco Documenti di Trasporto"
      brandContext="DDT"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-x-hidden sm:px-6"
    >
      <input ref={uploadInputRef} type="file" className="hidden" onChange={handleAttachmentFileSelection} />
      <section className="warehouse-section flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="min-w-0">
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Ricerca</label>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => loadDdtList(debouncedSearch)}
                  disabled={loading}
                  className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Aggiorna"
                  title="Aggiorna"
                >
                  <i className={`fa-solid fa-rotate-right text-[12px] ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                </button>
                <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
                <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="N DDT, nominativo, trasporto, causale, note"
                  className="ml-3 w-full bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  className={`ml-2 flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition ${
                    flagOnly ? "bg-rose-500/20 text-rose-400" : "hover:bg-[var(--hover)]"
                  }`}
                  onClick={() => {
                    setPage(1);
                    setFlagOnly((prev) => !prev);
                  }}
                  aria-label="Flag"
                  title="Flag (placeholder)"
                >
                  <i className="fa fa-warning text-[12px]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ml-2 flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                  onClick={() => setShowFilters((prev) => !prev)}
                  aria-label="Filtri"
                >
                  <i className="fa-solid fa-filter text-[12px]" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>Righe</span>
                <select
                  value={String(limit)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLimit(value === "all" ? "all" : parseInt(value, 10));
                  }}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--page-fg)]"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">Tutti</option>
                </select>
              </div>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-md border border-[var(--border)] px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-[var(--muted)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded-md border border-[var(--border)] px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        {showFilters ? (
          <div className="relative">
            <div className="absolute right-0 top-3 z-20 w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Filtri</p>
                <button type="button" className="text-xs text-[var(--muted)]" onClick={() => setShowFilters(false)}>
                  Chiudi
                </button>
              </div>
              <p className="text-sm text-[var(--muted)]">Definizione filtri in corso.</p>
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            Totale DDT: <span className="text-[var(--page-fg)]">{total}</span>
          </p>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <div className="w-full">
          <table className="warehouse-table table-dense w-full table-fixed text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[8%] px-3 py-2">N DDT</th>
                <th className="w-[8%] px-3 py-2">Data</th>
                <th className="w-[20%] px-3 py-2">Nominativo</th>
                <th className="w-[24%] px-3 py-2">Indirizzo destinazione</th>
                <th className="w-[16%] px-3 py-2">Trasporto a mezzo</th>
                <th className="w-[16%] px-3 py-2">Descrizione Movimento</th>
                <th className="w-[8%] px-3 py-2">Note interne</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const isActive = Number(row.cod) === Number(selectedCod);
                const hasAttachment = !!attachmentsByCod[Number(row.cod)];
                return (
                  <tr
                    key={row.cod}
                    className={`cursor-pointer border-t border-[var(--border)] ${isActive ? "bg-emerald-500/10" : ""}`}
                    onClick={() => setSelectedCod(Number(row.cod))}
                    onContextMenu={(event) => openRowMenu(event, row)}
                  >
                    <td className="px-3 py-2 font-semibold text-sky-400">
                      <span className="inline-flex items-center gap-2">
                        {row.numeroDdt || "-"}
                        {hasAttachment ? <i className="fa-solid fa-paperclip text-[10px] text-[var(--muted)]" aria-hidden="true" /> : null}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatDate(row.data)}</td>
                    <td className="px-3 py-2 font-semibold text-sky-400">
                      <span className="block truncate" title={row.nominativo || ""}>
                        {row.nominativo || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={row.indirizzoDestinazione || ""}>
                        {row.indirizzoDestinazione || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <span className="block truncate" title={row.trasportoMezzo || ""}>
                        {row.trasportoMezzo || "-"}
                      </span>
                    </td>
                    <td className={`px-3 py-2 ${getMovementColorClass(row.descrizioneMovimento)}`}>
                      <span className="block truncate" title={row.descrizioneMovimento || ""}>
                        {row.descrizioneMovimento || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={row.noteInterne || ""}>
                        {row.noteInterne || "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs text-[var(--muted)]">
                    Nessun DDT trovato.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <ContextMenu
        open={rowMenu.open}
        x={rowMenu.x}
        y={rowMenu.y}
        className="z-[80] min-w-[180px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
      >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
            onClick={handleViewAttachment}
          >
            <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
            Vedi allegato
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
            onClick={handleUploadAttachment}
          >
            <i className="fa-solid fa-upload text-xs" aria-hidden="true" />
            Carica allegato
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10"
            onClick={handleDeleteAttachment}
          >
            <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
            Elimina allegato
          </button>
      </ContextMenu>

      <div className="relative py-1">
        <div className="h-[2px] w-full bg-[var(--border)]" />
        <button
          type="button"
          title={detailsCollapsed ? "ESPANDI dettagli DDT" : "COMPRIMI dettagli DDT"}
          onClick={() => setDetailsCollapsed((prev) => !prev)}
          className="absolute left-1/2 top-1/2 inline-flex h-6 min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--muted)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-expanded={!detailsCollapsed}
          aria-controls="ddt-details-card"
        >
          <i className={`fa-solid text-[11px] ${detailsCollapsed ? "fa-caret-down" : "fa-caret-up"}`} aria-hidden="true" />
        </button>
      </div>

      <section
        id="ddt-details-card"
        className={`min-w-0 shrink-0 overflow-visible rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-[max-height,opacity] duration-300 ease-out md:overflow-hidden ${
          detailsCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-none opacity-100 md:max-h-[40dvh]"
        }`}
      >
        <div className="border-b border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Dettagli DDT</h2>
        </div>
        <div className="grid max-h-none gap-0 overflow-visible md:max-h-[40dvh] md:overflow-hidden lg:grid-cols-2">
          <div className="min-h-0 overflow-visible border-b border-[var(--border)] p-4 md:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">N DDT</p>
                <p className="mt-1 text-sm font-semibold">{details?.numeroDdt || selectedRow?.numeroDdt || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Data</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(details?.data || selectedRow?.data)}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Causale</p>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold">
                {details?.causale || selectedRow?.descrizioneMovimento || "-"}
              </p>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Nominativo</p>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold">
                {details?.nominativo || selectedRow?.nominativo || "-"}
              </p>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Indirizzo destinazione</p>
              <p className="mt-1 min-h-[64px] rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
                {details?.indirizzoDestinazione || selectedRow?.indirizzoDestinazione || "-"}
              </p>
            </div>
          </div>
          <div className="min-h-0 min-w-0 p-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Articoli in DDT</h3>
            <div className="mt-2 rounded-md border border-[var(--border)] md:hidden">
              <div className="max-h-[34dvh] overflow-auto">
                <table className="table-dense w-full table-fixed text-xs">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[10%]" />
                    <col className="w-[20%]" />
                    <col className="w-[50%]" />
                  </colgroup>
                  <thead className="bg-[var(--surface-strong)]">
                    <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      <th className="px-3 py-2">Codice articolo</th>
                      <th className="px-3 py-2">QT</th>
                      <th className="px-3 py-2">Seriale</th>
                      <th className="px-3 py-2">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(details?.articoli || []).map((item, index) => (
                      <tr key={`${details?.cod || "x"}-${item.codiceArticolo}-${index}`} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-semibold text-sky-400">{item.codiceArticolo || "-"}</td>
                        <td className="px-3 py-2">{item.quantita ?? 0}</td>
                        <td className="px-3 py-2">{item.seriale || "-"}</td>
                        <td className="px-3 py-2">
                          <span className="block truncate" title={item.descrizione || ""}>
                            {item.descrizione || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!detailsLoading && (!details?.articoli || details.articoli.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-xs text-[var(--muted)]">
                          Nessun articolo associato al DDT selezionato.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 hidden rounded-md border border-[var(--border)] md:block">
              <table className="table-dense w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                  <col className="w-[50%]" />
                </colgroup>
                <thead className="bg-[var(--surface-strong)]">
                  <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    <th className="px-3 py-2">Codice articolo</th>
                    <th className="px-3 py-2">QT</th>
                    <th className="px-3 py-2">Seriale</th>
                    <th className="px-3 py-2">Descrizione</th>
                  </tr>
                </thead>
              </table>
              <div className="max-h-[24dvh] overflow-y-auto">
                <table className="table-dense w-full table-fixed text-xs">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[10%]" />
                    <col className="w-[20%]" />
                    <col className="w-[50%]" />
                  </colgroup>
                  <tbody>
                    {(details?.articoli || []).map((item, index) => (
                      <tr key={`${details?.cod || "x"}-${item.codiceArticolo}-${index}`} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-semibold text-sky-400">{item.codiceArticolo || "-"}</td>
                        <td className="px-3 py-2">{item.quantita ?? 0}</td>
                        <td className="px-3 py-2">{item.seriale || "-"}</td>
                        <td className="px-3 py-2">
                          <span className="block truncate" title={item.descrizione || ""}>
                            {item.descrizione || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!detailsLoading && (!details?.articoli || details.articoli.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-xs text-[var(--muted)]">
                          Nessun articolo associato al DDT selezionato.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
