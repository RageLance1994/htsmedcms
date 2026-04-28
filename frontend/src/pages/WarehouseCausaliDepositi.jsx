import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

const getEditableFromRow = (row) => ({
  cod: row?.cod ?? "",
  descrizioneMovimento: row?.descrizioneMovimento || "",
  depositoInizialeCod: Number.isFinite(Number(row?.depositoIniziale)) ? Number(row.depositoIniziale) : null,
  depositoIniziale: row?.depositoInizialeNome || "-",
  depositoFinaleCod: Number.isFinite(Number(row?.depositoFinale)) ? Number(row.depositoFinale) : null,
  depositoFinale: row?.depositoFinaleNome || "-",
  azioneFisica: Number(row?.azioneFisica || 0),
  azioneFiscale: Number(row?.azioneFiscale || 0),
  nascondi: row?.nascondi === true,
  note: row?.note || ""
});

export default function WarehouseCausaliDepositi() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("tutti");
  const [soloNonNascoste, setSoloNonNascoste] = useState(true);

  const [selectedCod, setSelectedCod] = useState(null);
  const selected = useMemo(
    () => rows.find((row) => Number(row.cod) === Number(selectedCod)) || null,
    [rows, selectedCod]
  );

  const [detailsDraft, setDetailsDraft] = useState(getEditableFromRow(null));

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
      params.set("soloNonNascoste", soloNonNascoste ? "1" : "0");

      const res = await fetch(`${API_BASE}/api/warehouse/causali?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento causali/depositi");
      const payload = await res.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);

      if (data.length > 0) {
        const currentExists = data.some((row) => Number(row.cod) === Number(selectedCod));
        const nextCod = currentExists ? selectedCod : data[0].cod;
        setSelectedCod(nextCod);
      } else {
        setSelectedCod(null);
      }
    } catch (err) {
      setError(err.message || "Errore caricamento causali/depositi");
      setRows([]);
      setSelectedCod(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tipo, soloNonNascoste]);

  useEffect(() => {
    setDetailsDraft(getEditableFromRow(selected));
  }, [selected]);

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

          <div className="flex items-center gap-2">
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
              onClick={() => setSoloNonNascoste((prev) => !prev)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                soloNonNascoste
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
              }`}
            >
              Nascoste
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-50"
            >
              <i className={`fa-solid fa-rotate-right mr-2 text-[11px] ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Aggiorna
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
          <p>Totale causali: <span className="text-[var(--page-fg)]">{filteredRows.length}</span></p>
          <p>Depositi rilevati: <span className="text-[var(--page-fg)]">{depositi.length}</span></p>
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
                const active = Number(row.cod) === Number(selectedCod);
                return (
                  <tr
                    key={`causale-${row.cod}`}
                    className={`cursor-pointer border-t border-[var(--border)] ${active ? "bg-emerald-500/10" : ""}`}
                    onClick={() => setSelectedCod(row.cod)}
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

      <section className="grid min-h-0 shrink-0 gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 md:max-h-[38dvh] md:grid-cols-[1.25fr_0.75fr] sm:p-4">
        <div className="min-h-0 overflow-auto">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Codice</span>
              <input type="text" value={detailsDraft.cod} readOnly className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Azione fisica</span>
              <input
                type="number"
                autoComplete="off"
                value={detailsDraft.azioneFisica}
                onChange={(event) => setDetailsDraft((prev) => ({ ...prev, azioneFisica: Number(event.target.value || 0) }))}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Azione fiscale</span>
              <input
                type="number"
                autoComplete="off"
                value={detailsDraft.azioneFiscale}
                onChange={(event) => setDetailsDraft((prev) => ({ ...prev, azioneFiscale: Number(event.target.value || 0) }))}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Deposito iniziale</span>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
                {Number.isFinite(Number(detailsDraft.depositoInizialeCod)) ? (
                  <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    {Number(detailsDraft.depositoInizialeCod)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{detailsDraft.depositoIniziale || "-"}</span>
              </div>
            </label>
            <label className="text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Deposito finale</span>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
                {Number.isFinite(Number(detailsDraft.depositoFinaleCod)) ? (
                  <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    {Number(detailsDraft.depositoFinaleCod)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{detailsDraft.depositoFinale || "-"}</span>
              </div>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={detailsDraft.nascondi}
                onChange={(event) => setDetailsDraft((prev) => ({ ...prev, nascondi: event.target.checked }))}
                className="h-4 w-4"
              />
              <span>Nascosta</span>
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Causale</span>
            <input
              type="text"
              autoComplete="off"
              value={detailsDraft.descrizioneMovimento}
              onChange={(event) => setDetailsDraft((prev) => ({ ...prev, descrizioneMovimento: event.target.value }))}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Note</p>
            <textarea
              autoComplete="off"
              value={detailsDraft.note}
              onChange={(event) => setDetailsDraft((prev) => ({ ...prev, note: event.target.value }))}
              className="mt-1 h-full min-h-[160px] w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
