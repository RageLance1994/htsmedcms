import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PRIORITY_OPTIONS = ["ALTA", "MEDIA", "BASSA"];
const STATUS_OPTIONS = ["IN ATTESA", "TESTATO IN LABORATORIO", "COMPLETATO"];

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
};

const getPriorityClass = (value) => {
  const v = String(value || "").trim().toUpperCase();
  if (v === "ALTA") return "bg-rose-500/20 text-rose-300";
  if (v === "MEDIA") return "bg-amber-500/20 text-amber-300";
  if (v === "BASSA") return "bg-emerald-500/20 text-emerald-300";
  return "text-[var(--muted)]";
};

const getInitialForm = () => ({
  descrizioneParte: "",
  partNumber: "",
  serialNumber: "",
  cliente: "",
  sistema: "",
  descrizioneProblema: "",
  dataIngresso: new Date().toISOString().slice(0, 10),
  richiedente: "",
  priorita: "MEDIA",
  statoLavoro: "IN ATTESA"
});

export default function WarehouseRiparazioni() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("dataIngresso");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedProtocollo, setSelectedProtocollo] = useState("");
  const selected = useMemo(
    () => rows.find((row) => String(row.protocollo) === String(selectedProtocollo)) || null,
    [rows, selectedProtocollo]
  );

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState(getInitialForm());
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState("");
  const [detailsCollapsedMobile, setDetailsCollapsedMobile] = useState(true);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const loadRepairs = async (
    nextPage = page,
    nextSearch = search,
    nextLimit = limit,
    nextSortBy = sortBy,
    nextSortDir = sortDir
  ) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
        search: String(nextSearch || "").trim(),
        sortBy: String(nextSortBy || "dataIngresso"),
        sortDir: String(nextSortDir || "desc")
      });
      const res = await fetch(`${API_BASE}/api/warehouse/riparazioni?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento riparazioni");
      const payload = await res.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);
      setTotal(Number(payload?.total || 0));
      setPage(Number(payload?.page || nextPage));

      if (data.length > 0) {
        const exists = data.some((row) => String(row.protocollo) === String(selectedProtocollo));
        if (!exists) setSelectedProtocollo(String(data[0].protocollo || ""));
      } else {
        setSelectedProtocollo("");
      }
    } catch (err) {
      setError(err.message || "Errore caricamento riparazioni");
      setRows([]);
      setTotal(0);
      setSelectedProtocollo("");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    const sameField = sortBy === field;
    const nextDir = sameField ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortBy(field);
    setSortDir(nextDir);
    loadRepairs(1, search, limit, field, nextDir);
  };

  const sortIcon = (field) => {
    if (sortBy !== field) return "fa-sort text-[var(--muted)]";
    return sortDir === "asc" ? "fa-sort-up text-sky-300" : "fa-sort-down text-sky-300";
  };

  useEffect(() => {
    loadRepairs(1, "", 50);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadRepairs(1, search, limit, sortBy, sortDir);
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  const openNewModal = () => {
    setNewError("");
    setNewForm(getInitialForm());
    setNewModalOpen(true);
  };

  const saveNewRepair = async () => {
    setNewSaving(true);
    setNewError("");
    try {
      const payload = {
        ...newForm,
        descrizioneParte: String(newForm.descrizioneParte || "").trim(),
        partNumber: String(newForm.partNumber || "").trim(),
        serialNumber: String(newForm.serialNumber || "").trim(),
        cliente: String(newForm.cliente || "").trim(),
        sistema: String(newForm.sistema || "").trim(),
        descrizioneProblema: String(newForm.descrizioneProblema || "").trim(),
        richiedente: String(newForm.richiedente || "").trim()
      };

      const res = await fetch(`${API_BASE}/api/warehouse/riparazioni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.errore || "Errore creazione richiesta");

      setNewModalOpen(false);
      await loadRepairs(1, search, limit);
      if (body?.riparazione?.protocollo) setSelectedProtocollo(String(body.riparazione.protocollo));
    } catch (err) {
      setNewError(err.message || "Errore creazione richiesta");
    } finally {
      setNewSaving(false);
    }
  };

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino-Lab"
      pageTitle="Lab Riparazioni"
      brandContext="Warehouse"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <button
                type="button"
                onClick={() => loadRepairs(page, search, limit)}
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
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Protocollo, parte, seriale, cliente, sistema"
                className="ml-3 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Nuova Richiesta
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>Totale richieste: <span className="text-[var(--page-fg)]">{total}</span></p>
          <div className="flex items-center gap-2">
            <span className="text-xs">Righe</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                const v = parseInt(event.target.value, 10);
                setLimit(v);
                loadRepairs(1, search, v);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => loadRepairs(page - 1, search, limit)}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => loadRepairs(page + 1, search, limit)}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <table className="warehouse-table table-dense w-full min-w-[1300px] table-fixed text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[9%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("protocollo")} className="inline-flex items-center gap-1">
                    Protocollo <i className={`fa-solid ${sortIcon("protocollo")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[6%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("priorita")} className="inline-flex items-center gap-1">
                    Priorita <i className={`fa-solid ${sortIcon("priorita")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[14%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("esito")} className="inline-flex items-center gap-1">
                    Esito <i className={`fa-solid ${sortIcon("esito")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[10%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("statoLavoro")} className="inline-flex items-center gap-1">
                    Stato <i className={`fa-solid ${sortIcon("statoLavoro")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[7%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("dataIngresso")} className="inline-flex items-center gap-1">
                    Ingresso <i className={`fa-solid ${sortIcon("dataIngresso")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[7%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("dataTermine")} className="inline-flex items-center gap-1">
                    Termine <i className={`fa-solid ${sortIcon("dataTermine")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[12%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("descrizioneParte")} className="inline-flex items-center gap-1">
                    Descrizione Parte <i className={`fa-solid ${sortIcon("descrizioneParte")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[8%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("partNumber")} className="inline-flex items-center gap-1">
                    Part Number <i className={`fa-solid ${sortIcon("partNumber")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[8%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("serialNumber")} className="inline-flex items-center gap-1">
                    Serial Number <i className={`fa-solid ${sortIcon("serialNumber")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[9%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("cliente")} className="inline-flex items-center gap-1">
                    Cliente <i className={`fa-solid ${sortIcon("cliente")}`} aria-hidden="true" />
                  </button>
                </th>
                <th className="w-[10%] px-3 py-2">
                  <button type="button" onClick={() => handleSort("sistema")} className="inline-flex items-center gap-1">
                    Sistema <i className={`fa-solid ${sortIcon("sistema")}`} aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = String(row.protocollo) === String(selectedProtocollo);
                const priority = String(row.priorita || "").trim().toUpperCase();
                const highPriorityRow = priority === "ALTA";
                return (
                  <tr
                    key={row.protocollo}
                    className={`cursor-pointer border-t border-[var(--border)] ${
                      active ? "bg-emerald-500/10" : highPriorityRow ? "bg-rose-500/5" : ""
                    }`}
                    onClick={() => setSelectedProtocollo(String(row.protocollo || ""))}
                  >
                    <td className="px-3 py-2 font-semibold text-sky-400">{row.protocollo || "-"}</td>
                    <td className={`px-3 py-2 font-semibold uppercase tracking-[0.06em] ${getPriorityClass(row.priorita)}`}>
                      {row.priorita || "-"}
                    </td>
                    <td className="px-3 py-2"><span className="block truncate" title={row.esito || ""}>{row.esito || "-"}</span></td>
                    <td className="px-3 py-2">{row.statoLavoro || "-"}</td>
                    <td className="px-3 py-2">{formatDate(row.dataIngresso)}</td>
                    <td className="px-3 py-2">{formatDate(row.dataTermine)}</td>
                    <td className="px-3 py-2"><span className="block truncate" title={row.descrizioneParte || ""}>{row.descrizioneParte || "-"}</span></td>
                    <td className="px-3 py-2">{row.partNumber || "-"}</td>
                    <td className="px-3 py-2">{row.serialNumber || "-"}</td>
                    <td className="px-3 py-2"><span className="block truncate" title={row.cliente || ""}>{row.cliente || "-"}</span></td>
                    <td className="px-3 py-2"><span className="block truncate" title={row.sistema || ""}>{row.sistema || "-"}</span></td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-xs text-[var(--muted)]">Nessuna richiesta trovata.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between md:hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Dettagli richiesta</p>
          <button
            type="button"
            onClick={() => setDetailsCollapsedMobile((prev) => !prev)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
          >
            {detailsCollapsedMobile ? "Apri" : "Chiudi"}
          </button>
        </div>

        <div
          className={`grid gap-3 md:max-h-[38dvh] md:grid-cols-[1fr_1fr] ${
            detailsCollapsedMobile ? "max-h-0 overflow-hidden md:max-h-[38dvh]" : "max-h-[50dvh] overflow-hidden"
          }`}
        >
        <div className="min-h-0 overflow-auto">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Priorita</p><p className="mt-1 text-sm font-semibold">{selected?.priorita || "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Stato</p><p className="mt-1 text-sm font-semibold">{selected?.statoLavoro || "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Data ingresso</p><p className="mt-1 text-sm font-semibold">{formatDate(selected?.dataIngresso)}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Data termine</p><p className="mt-1 text-sm font-semibold">{formatDate(selected?.dataTermine)}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Cliente</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.cliente || "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Sistema</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.sistema || "-"}</p></div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione Problema</p>
            <p className="mt-1 min-h-[80px] rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm whitespace-pre-wrap break-words">{selected?.descrizioneProblema || "-"}</p>
          </div>
        </div>

        <div className="min-h-0 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Tecnico Riparatore</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.tecnicoRiparatore || "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Richiedente</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.richiedente || "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Costo Parti</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.costoParti ?? "-"}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Ore lavoro</p><p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">{selected?.oreLavoro ?? "-"}</p></div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Parti Sostituite</p>
            <p className="mt-1 min-h-[64px] rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm whitespace-pre-wrap break-words">{selected?.partsSostituite || "-"}</p>
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Note</p>
            <p className="mt-1 min-h-[64px] rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm whitespace-pre-wrap break-words">{selected?.note || "-"}</p>
          </div>
        </div>
        </div>
      </section>

      {newModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/80 px-3 py-3 sm:items-center sm:px-4 sm:py-8" onMouseDown={() => setNewModalOpen(false)}>
          <div className="my-auto flex w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-4rem)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
              <h2 className="text-xl font-semibold">Nuova Richiesta Riparazione</h2>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]" onClick={() => setNewModalOpen(false)} aria-label="Chiudi">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="text-sm lg:col-span-2"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione Parte</span><input autoComplete="off" type="text" value={newForm.descrizioneParte} onChange={(e) => setNewForm((p) => ({ ...p, descrizioneParte: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Part Number</span><input autoComplete="off" type="text" value={newForm.partNumber} onChange={(e) => setNewForm((p) => ({ ...p, partNumber: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Serial Number</span><input autoComplete="off" type="text" value={newForm.serialNumber} onChange={(e) => setNewForm((p) => ({ ...p, serialNumber: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Cliente</span><input autoComplete="off" type="text" value={newForm.cliente} onChange={(e) => setNewForm((p) => ({ ...p, cliente: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Sistema</span><input autoComplete="off" type="text" value={newForm.sistema} onChange={(e) => setNewForm((p) => ({ ...p, sistema: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Data Ingresso</span><input autoComplete="off" type="date" value={newForm.dataIngresso} onChange={(e) => setNewForm((p) => ({ ...p, dataIngresso: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Richiedente</span><input autoComplete="off" type="text" value={newForm.richiedente} onChange={(e) => setNewForm((p) => ({ ...p, richiedente: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Priorita</span><select value={newForm.priorita} onChange={(e) => setNewForm((p) => ({ ...p, priorita: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{PRIORITY_OPTIONS.map((o)=><option key={o} value={o}>{o}</option>)}</select></label>
                <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Stato Lavoro</span><select value={newForm.statoLavoro} onChange={(e) => setNewForm((p) => ({ ...p, statoLavoro: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{STATUS_OPTIONS.map((o)=><option key={o} value={o}>{o}</option>)}</select></label>
                <label className="text-sm lg:col-span-2"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione Problema</span><textarea autoComplete="off" rows={4} value={newForm.descrizioneProblema} onChange={(e) => setNewForm((p) => ({ ...p, descrizioneProblema: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
              </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4">
              <button type="button" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm" onClick={() => setNewModalOpen(false)}>Annulla</button>
              <button type="button" onClick={saveNewRepair} disabled={newSaving} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{newSaving ? "Salvataggio..." : "Salva e Chiudi"}</button>
            </div>
            {newError ? <p className="px-4 pb-4 text-sm text-rose-500 sm:px-6">{newError}</p> : null}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
