import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
};

export default function WarehouseChecklistInterne() {
  const [rows, setRows] = useState([]);
  const [details, setDetails] = useState([]);
  const [selectedCod, setSelectedCod] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [templates, setTemplates] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [movSearch, setMovSearch] = useState("");
  const [movRows, setMovRows] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState("");
  const [loadedTemplateDetails, setLoadedTemplateDetails] = useState([]);
  const [mobileListCollapsed, setMobileListCollapsed] = useState(false);
  const [detailItems, setDetailItems] = useState([]);

  const [form, setForm] = useState({
    dataInizio: new Date().toISOString().slice(0, 10),
    codTemplate: "",
    modelloSistema: "",
    codMovimento: "",
    fornitore: "",
    seriale: "",
    numeroOrdine: ""
  });

  const selected = useMemo(() => rows.find((r) => Number(r.cod) === Number(selectedCod)) || null, [rows, selectedCod]);
  const displayedDetails = loadedTemplateDetails.length > 0 ? loadedTemplateDetails : details;

  const loadChecklist = async (q = search) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: "1", limit: "80", search: String(q || "") });
      const res = await fetch(`${API_BASE}/api/warehouse/checklist-interne?${p.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list);
      if (list.length > 0) setSelectedCod(Number(list[0].cod || 0));
      else setSelectedCod(0);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (cod) => {
    if (!cod) {
      setDetails([]);
      return;
    }
    const res = await fetch(`${API_BASE}/api/warehouse/checklist-interne/${cod}/dettagli`);
    const data = await res.json();
    setDetails(Array.isArray(data?.data) ? data.data : []);
  };

  const loadTemplates = async () => {
    const res = await fetch(`${API_BASE}/api/warehouse/checklist-interne/templates`);
    const data = await res.json();
    setTemplates(Array.isArray(data?.data) ? data.data : []);
  };

  const loadMovimenti = async (q = movSearch) => {
    const p = new URLSearchParams({ limit: "120", search: String(q || "") });
    const res = await fetch(`${API_BASE}/api/warehouse/checklist-interne/movimenti?${p.toString()}`);
    const data = await res.json();
    setMovRows(Array.isArray(data?.data) ? data.data : []);
  };

  useEffect(() => {
    loadChecklist("");
    loadTemplates();
  }, []);

  useEffect(() => {
    loadDetails(selectedCod);
    setLoadedTemplateName("");
    setLoadedTemplateDetails([]);
  }, [selectedCod]);

  useEffect(() => {
    const t = setTimeout(() => loadChecklist(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!movOpen) return;
    const t = setTimeout(() => loadMovimenti(movSearch), 180);
    return () => clearTimeout(t);
  }, [movSearch, movOpen]);

  useEffect(() => {
    setDetailItems(
      displayedDetails.map((item, idx) => ({
        id: `${item.progressivo || idx + 1}-${idx}`,
        progressivo: Number(item.progressivo || idx + 1),
        voce: String(item.voce || "").trim(),
        checked: String(item.superato || "").trim().toUpperCase() === "SI",
        note: String(item.note || "").trim(),
        noteDraft: String(item.note || "").trim(),
        commentsOpen: false
      }))
    );
  }, [displayedDetails]);

  const handleSaveTemplate = () => {
    if (!selected || details.length === 0) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: {
        cod: selected.cod,
        protocollo: selected.protocollo || "",
        modelloSistema: selected.modelloSistema || ""
      },
      checklist: details.map((d) => ({
        progressivo: Number(d.progressivo || 0),
        voce: String(d.voce || "").trim(),
        superato: String(d.superato || "").trim(),
        note: String(d.note || "").trim()
      }))
    };
    const fileBase = String(selected.protocollo || "template_checklist").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoadTemplate = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const imported = Array.isArray(parsed?.checklist) ? parsed.checklist : [];
        const normalized = imported.map((item, idx) => ({
          progressivo: Number(item?.progressivo || idx + 1),
          voce: String(item?.voce || "").trim(),
          superato: String(item?.superato || "").trim().toUpperCase(),
          note: String(item?.note || "").trim()
        }));
        setLoadedTemplateName(file.name);
        setLoadedTemplateDetails(normalized);
      } catch {
        alert("Template non valido.");
      }
    };
    input.click();
  };

  const handlePrintChecklist = () => {
    const title = loadedTemplateName || selected?.protocollo || "Checklist";
    const rowsHtml = detailItems
      .map(
        (item) => `
          <tr>
            <td>${item.progressivo}</td>
            <td>${String(item.voce || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
            <td>${item.checked ? "SI" : "NO"}</td>
            <td>${String(item.note || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 12px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr><th style="width:60px;">Prog.</th><th>Voce/Controllo</th><th style="width:70px;">OK</th><th style="width:240px;">Commenti</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino-Lab"
      pageTitle="Checklist Interne"
      brandContext="Warehouse"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[61.8%_38.2%]">
        <div
          className={`flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 ${
            mobileListCollapsed ? "h-auto flex-none lg:flex-1" : "flex-1"
          }`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Lista checklist</p>
            <button
              type="button"
              onClick={() => setMobileListCollapsed((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)]"
            >
              <i className={`fa-solid ${mobileListCollapsed ? "fa-caret-down" : "fa-caret-up"}`} />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
              mobileListCollapsed ? "max-h-0 opacity-0 lg:max-h-[100dvh] lg:opacity-100" : "max-h-[80dvh] opacity-100 lg:max-h-[100dvh]"
            }`}
          >
          <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Protocollo, modello, fornitore" className="ml-3 w-full bg-transparent text-sm outline-none" />
            </div>
            <button className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600" onClick={() => setNewOpen(true)}>Nuova Check</button>
          </div>

          <div className="min-h-[32dvh] max-h-[45dvh] flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--border)] lg:min-h-0 lg:max-h-none">
            <table className="warehouse-table table-dense w-full table-fixed text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
                <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <th className="w-[24%] px-3 py-2">Protocollo</th>
                  <th className="w-[28%] px-3 py-2">Modello</th>
                  <th className="w-[14%] px-3 py-2">S/N</th>
                  <th className="w-[22%] px-3 py-2">Fornitore</th>
                  <th className="w-[12%] px-3 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const active = Number(selectedCod) === Number(row.cod);
                  return (
                    <tr key={row.cod} onClick={() => setSelectedCod(Number(row.cod || 0))} className={`cursor-pointer border-t border-[var(--border)] ${active ? "bg-emerald-500/10" : ""}`}>
                      <td className="px-3 py-2 font-semibold text-sky-400"><span className="block truncate">{row.protocollo || "-"}</span></td>
                      <td className="px-3 py-2"><span className="block truncate">{row.modelloSistema || "-"}</span></td>
                      <td className="px-3 py-2"><span className="block truncate">{row.seriale || "-"}</span></td>
                      <td className="px-3 py-2"><span className="block truncate">{row.fornitore || "-"}</span></td>
                      <td className="px-3 py-2"><span className="block truncate">{formatDate(row.dataInizio)}</span></td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-xs text-[var(--muted)]">Nessuna checklist trovata.</td></tr> : null}
              </tbody>
            </table>
          </div>
          </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Dettagli checklist selezionata</p>
            <div className="relative flex items-center gap-2">
              <p className="text-xs text-[var(--muted)]">{loadedTemplateName || selected?.protocollo || "-"}</p>
              <button
                type="button"
                onClick={() => setActionsOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--hover)]"
                aria-label="Azioni checklist"
              >
                <i className="fa-solid fa-ellipsis" />
              </button>
              {actionsOpen ? (
                <div className="absolute right-0 top-9 z-20 w-40 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleSaveTemplate();
                    }}
                    className="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
                  >
                    <i className="fa-solid fa-floppy-disk text-emerald-300" />
                    <span>Salva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleLoadTemplate();
                    }}
                    className="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
                  >
                    <i className="fa-solid fa-folder-open text-sky-300" />
                    <span>Carica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handlePrintChecklist();
                    }}
                    className="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
                  >
                    <i className="fa-solid fa-print text-amber-300" />
                    <span>Stampa</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] p-2">
            <div className="space-y-2">
              {detailItems.map((item) => (
                <div key={item.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-2">
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDetailItems((prev) =>
                        prev.map((row) => (row.id === item.id ? { ...row, checked: !row.checked } : row))
                      )
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      item.checked ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-[var(--border)] text-transparent"
                    }`}
                    aria-label="Toggle completato"
                  >
                    <i className="fa-solid fa-check text-[10px]" />
                  </button>

                  <div className="w-8 shrink-0 text-xs text-[var(--muted)]">{item.progressivo}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="block truncate">{item.voce || "-"}</span>
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, commentsOpen: !row.commentsOpen, noteDraft: row.noteDraft ?? row.note } : row
                          )
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--hover)]"
                      title="Commenti"
                    >
                      <i className="fa-regular fa-note-sticky text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailItems((prev) => {
                          const idx = prev.findIndex((row) => row.id === item.id);
                          if (idx < 0) return prev;
                          const clone = { ...prev[idx], id: `${prev[idx].id}-dup-${Date.now()}` };
                          const next = [...prev];
                          next.splice(idx + 1, 0, clone);
                          return next;
                        })
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--hover)]"
                      title="Duplica"
                    >
                      <i className="fa-regular fa-copy text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailItems((prev) => prev.filter((row) => row.id !== item.id))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-rose-300 hover:bg-rose-500/10"
                      title="Elimina"
                    >
                      <i className="fa-regular fa-trash-can text-xs" />
                    </button>
                  </div>
                </div>
                {item.commentsOpen ? (
                  <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Commenti</p>
                    <div className="flex items-center gap-2">
                      <textarea
                        value={item.noteDraft || ""}
                        onChange={(e) => {
                          const el = e.target;
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                          setDetailItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, noteDraft: e.target.value } : row)));
                        }}
                        rows={1}
                        className="w-full min-h-[40px] resize-none overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDetailItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, note: row.noteDraft || "", commentsOpen: false } : row
                            )
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        title="Annota"
                        aria-label="Annota"
                      >
                        <i className="fa-solid fa-check text-xs" />
                      </button>
                    </div>
                  </div>
                ) : null}
                </div>
              ))}
              {detailItems.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-[var(--muted)]">Nessun dettaglio disponibile.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {newOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-3" onMouseDown={() => setNewOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Inizializzazione Check Interna</h2><button className="h-8 w-8 rounded-md border border-[var(--border)]" onClick={() => setNewOpen(false)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Data inizio check</span><input type="date" value={form.dataInizio} onChange={(e) => setForm((p) => ({ ...p, dataInizio: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2" /></label>
              <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Modello check interna</span><select value={form.codTemplate} onChange={(e) => { const cod = e.target.value; const t = templates.find((x) => String(x.cod) === cod); setForm((p) => ({ ...p, codTemplate: cod, modelloSistema: t?.modelloSistema || "" })); }} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><option value="">Seleziona...</option>{templates.map((t) => <option key={t.cod} value={String(t.cod)}>{t.modelloSistema || `Template ${t.cod}`}</option>)}</select></label>
              <label className="text-sm sm:col-span-2"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Fornitore sistema (da carico magazzino)</span><div className="mt-2 flex gap-2"><input value={form.fornitore} readOnly className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2" /><button className="rounded-md border border-[var(--border)] px-3" onClick={() => { setMovOpen(true); loadMovimenti(""); }}>Seleziona Carico</button></div></label>
              <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Serial Number sistema</span><input value={form.seriale} onChange={(e) => setForm((p) => ({ ...p, seriale: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2" /></label>
              <label className="text-sm"><span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Numero d'ordine</span><input value={form.numeroOrdine} onChange={(e) => setForm((p) => ({ ...p, numeroOrdine: e.target.value }))} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2" /></label>
            </div>
            <div className="mt-4 flex justify-end gap-2"><button className="rounded-md border border-[var(--border)] px-4 py-2" onClick={() => setNewOpen(false)}>Annulla</button><button className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white" disabled>Procedi</button></div>
          </div>
        </div>
      ) : null}

      {movOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/85 px-3" onMouseDown={() => setMovOpen(false)}>
          <div className="w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">Seleziona Carico Magazzino</h3><button className="h-8 w-8 rounded-md border border-[var(--border)]" onClick={() => setMovOpen(false)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="mb-3 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" /><input value={movSearch} onChange={(e) => setMovSearch(e.target.value)} placeholder="Cerca fornitore, codice articolo, note" className="ml-3 w-full bg-transparent text-sm outline-none" /></div>
            <div className="max-h-[55dvh] overflow-auto rounded-md border border-[var(--border)]">
              <table className="warehouse-table table-dense w-full min-w-[900px] table-fixed text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-[var(--surface-strong)]"><tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"><th className="w-[12%] px-3 py-2">Cod Mov.</th><th className="w-[10%] px-3 py-2">Data</th><th className="w-[12%] px-3 py-2">N. Ordine</th><th className="w-[24%] px-3 py-2">Fornitore</th><th className="w-[16%] px-3 py-2">Cod. Articolo</th><th className="w-[26%] px-3 py-2">Note</th></tr></thead>
                <tbody>{movRows.map((m) => <tr key={m.codMovimento} className="cursor-pointer border-t border-[var(--border)] hover:bg-emerald-500/10" onClick={() => { setForm((p) => ({ ...p, codMovimento: String(m.codMovimento || ""), fornitore: m.fornitore || "", numeroOrdine: m.numeroOrdine || "" })); setMovOpen(false); }}><td className="px-3 py-2 font-semibold text-sky-400">{m.codMovimento || "-"}</td><td className="px-3 py-2">{formatDate(m.data)}</td><td className="px-3 py-2">{m.numeroOrdine || "-"}</td><td className="px-3 py-2 truncate">{m.fornitore || "-"}</td><td className="px-3 py-2">{m.codiceArticolo || "-"}</td><td className="px-3 py-2 truncate">{m.note || "-"}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
