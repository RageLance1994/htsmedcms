import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ACTION_OPTIONS = [
  { value: 1, label: "Carico (+1)" },
  { value: 0, label: "Neutra (0)" },
  { value: -1, label: "Scarico (-1)" }
];

const formatAction = (value) => {
  const num = Number(value || 0);
  if (num > 0) return `+${num}`;
  if (num < 0) return `${num}`;
  return "0";
};

const getActionClass = (value) => {
  const num = Number(value || 0);
  if (num > 0) return "text-emerald-400";
  if (num < 0) return "text-rose-400";
  return "text-[var(--muted)]";
};

export default function WarehouseCausaliDepositi() {
  const [rows, setRows] = useState([]);
  const [depositiCatalog, setDepositiCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("tutti");

  const [newCausaleOpen, setNewCausaleOpen] = useState(false);
  const [newCausaleSaving, setNewCausaleSaving] = useState(false);
  const [newCausaleError, setNewCausaleError] = useState("");
  const [newCausaleForm, setNewCausaleForm] = useState({
    cod: "",
    descrizioneMovimento: "",
    depositoIniziale: "",
    depositoFinale: "",
    azioneDisponibilita: 0,
    azioneFiscale: 0,
    validoPerDdt: true,
    nascondi: false,
    note: ""
  });

  const filteredRows = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const cod = String(row.cod || "").toLowerCase();
      const descrizione = String(row.descrizioneMovimento || "").toLowerCase();
      const depIn = String(row.depositoInizialeNome || "").toLowerCase();
      const depOut = String(row.depositoFinaleNome || "").toLowerCase();
      return cod.includes(term) || descrizione.includes(term) || depIn.includes(term) || depOut.includes(term);
    });
  }, [rows, search]);

  const depositi = useMemo(() => {
    if (depositiCatalog.length > 0) {
      return [...depositiCatalog]
        .map((item) => [Number(item.cod), String(item.descrizione || String(item.cod || ""))])
        .filter(([cod]) => Number.isFinite(cod))
        .sort((a, b) => a[0] - b[0]);
    }
    const map = new Map();
    rows.forEach((row) => {
      const inCod = Number(row.depositoIniziale);
      const outCod = Number(row.depositoFinale);
      if (Number.isFinite(inCod)) map.set(inCod, row.depositoInizialeNome || String(inCod));
      if (Number.isFinite(outCod)) map.set(outCod, row.depositoFinaleNome || String(outCod));
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rows]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tipo === "carico" || tipo === "scarico") {
        params.set("tipo", tipo);
      }
      params.set("soloNonNascoste", "1");

      const res = await fetch(`${API_BASE}/api/warehouse/causali?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento causali/depositi");
      const payload = await res.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      const depositiPayload = Array.isArray(payload?.depositi) ? payload.depositi : [];
      setRows(data);
      setDepositiCatalog(depositiPayload);
    } catch (err) {
      setError(err.message || "Errore caricamento causali/depositi");
      setRows([]);
      setDepositiCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tipo]);

  const openNewCausaleModal = () => {
    const codMax = rows.reduce((acc, row) => {
      const cod = Number(row?.cod);
      return Number.isFinite(cod) && cod > acc ? cod : acc;
    }, 0);
    const defaultDep = Number(depositi?.[0]?.[0]);
    const safeDep = Number.isFinite(defaultDep) ? defaultDep : 0;
    setNewCausaleError("");
    setNewCausaleForm({
      cod: String(codMax + 1),
      descrizioneMovimento: "",
      depositoIniziale: String(safeDep),
      depositoFinale: String(safeDep),
      azioneDisponibilita: 0,
      azioneFiscale: 0,
      validoPerDdt: true,
      nascondi: false,
      note: ""
    });
    setNewCausaleOpen(true);
  };

  const saveNewCausale = async () => {
    setNewCausaleSaving(true);
    setNewCausaleError("");
    try {
      const payload = {
        cod: Number.parseInt(newCausaleForm.cod, 10),
        descrizioneMovimento: newCausaleForm.descrizioneMovimento,
        depositoIniziale: Number.parseInt(newCausaleForm.depositoIniziale, 10),
        depositoFinale: Number.parseInt(newCausaleForm.depositoFinale, 10),
        azioneDisponibilita: Number.parseInt(String(newCausaleForm.azioneDisponibilita), 10),
        azioneFiscale: Number.parseInt(String(newCausaleForm.azioneFiscale), 10),
        validoPerDdt: newCausaleForm.validoPerDdt === true,
        nascondi: newCausaleForm.nascondi === true,
        note: newCausaleForm.note
      };

      const res = await fetch(`${API_BASE}/api/warehouse/causali`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.errore || "Errore creazione causale");

      setNewCausaleOpen(false);
      await loadData();
    } catch (err) {
      setNewCausaleError(err.message || "Errore creazione causale");
    } finally {
      setNewCausaleSaving(false);
    }
  };

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino-Lab"
      pageTitle="Causali Depositi"
      brandContext="Warehouse"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
              <input
                type="text"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Codice, causale o deposito"
                className="ml-3 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="tutti">Tutte</option>
              <option value="carico">Carico</option>
              <option value="scarico">Scarico</option>
            </select>
            <button
              type="button"
              onClick={openNewCausaleModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/15 text-lg font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
              aria-label="Nuova causale"
              title="Nuova causale"
            >
              +
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-3 flex items-center text-sm text-[var(--muted)]">
          <p>Totale causali: <span className="text-[var(--page-fg)]">{filteredRows.length}</span></p>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <table className="warehouse-table table-dense w-full min-w-[900px] table-fixed text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[6%] px-3 py-2 whitespace-nowrap">Cod</th>
                <th className="w-[29%] px-3 py-2 whitespace-nowrap">Causale</th>
                <th className="w-[21%] px-3 py-2 whitespace-nowrap">Dep. Iniziale</th>
                <th className="w-[21%] px-3 py-2 whitespace-nowrap">Dep. Finale</th>
                <th className="w-[9%] px-3 py-2 whitespace-nowrap">Fisica</th>
                <th className="w-[9%] px-3 py-2 whitespace-nowrap">Fiscale</th>
                <th className="w-[5%] px-3 py-2 whitespace-nowrap">N</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                return (
                  <tr
                    key={`causale-${row.cod}`}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-3 py-2 font-semibold text-sky-400 whitespace-nowrap">{row.cod ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="block truncate" title={row.descrizioneMovimento || ""}>{row.descrizioneMovimento || "-"}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {Number.isFinite(Number(row.depositoIniziale)) ? (
                          <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                            {Number(row.depositoIniziale)}
                          </span>
                        ) : null}
                        <span className="truncate">{row.depositoInizialeNome || "-"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {Number.isFinite(Number(row.depositoFinale)) ? (
                          <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                            {Number(row.depositoFinale)}
                          </span>
                        ) : null}
                        <span className="truncate">{row.depositoFinaleNome || "-"}</span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${getActionClass(row.azioneFisica)}`}>{formatAction(row.azioneFisica)}</td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${getActionClass(row.azioneFiscale)}`}>{formatAction(row.azioneFiscale)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.nascondi ? "Si" : "No"}</td>
                  </tr>
                );
              })}
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs text-[var(--muted)]">Nessuna causale disponibile.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {newCausaleOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-3 py-3"
          onMouseDown={() => {
            if (newCausaleSaving) return;
            setNewCausaleOpen(false);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl sm:p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Nuova causale movimento</p>
                <h3 className="mt-1 text-lg font-semibold">Creazione causale</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewCausaleOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                aria-label="Chiudi"
                disabled={newCausaleSaving}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Codice</span>
                <input
                  type="number"
                  value={newCausaleForm.cod}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, cod: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione movimento</span>
                <input
                  type="text"
                  value={newCausaleForm.descrizioneMovimento}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, descrizioneMovimento: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Deposito iniziale</span>
                <select
                  value={String(newCausaleForm.depositoIniziale)}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, depositoIniziale: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                >
                  {depositi.map(([cod, nome]) => (
                    <option key={`dep-in-${cod}`} value={String(cod)}>
                      {cod} - {nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Deposito finale</span>
                <select
                  value={String(newCausaleForm.depositoFinale)}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, depositoFinale: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                >
                  {depositi.map(([cod, nome]) => (
                    <option key={`dep-out-${cod}`} value={String(cod)}>
                      {cod} - {nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Variazione fisica</span>
                <select
                  value={String(newCausaleForm.azioneDisponibilita)}
                  onChange={(event) =>
                    setNewCausaleForm((prev) => ({ ...prev, azioneDisponibilita: Number.parseInt(event.target.value, 10) }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={`disp-${opt.value}`} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Variazione fiscale</span>
                <select
                  value={String(newCausaleForm.azioneFiscale)}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, azioneFiscale: Number.parseInt(event.target.value, 10) }))}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={`fisc-${opt.value}`} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-4 pb-1 text-sm sm:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCausaleForm.validoPerDdt}
                    onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, validoPerDdt: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span>Valida per DDT</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCausaleForm.nascondi}
                    onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, nascondi: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span>Nascosta</span>
                </label>
              </div>

              <label className="text-sm sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Note</span>
                <textarea
                  value={newCausaleForm.note}
                  onChange={(event) => setNewCausaleForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="mt-1 h-24 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                />
              </label>
            </div>

            {newCausaleError ? <p className="mt-3 text-sm text-rose-500">{newCausaleError}</p> : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewCausaleOpen(false)}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--hover)]"
                disabled={newCausaleSaving}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={saveNewCausale}
                disabled={newCausaleSaving}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {newCausaleSaving ? "Salvataggio..." : "Salva causale"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
