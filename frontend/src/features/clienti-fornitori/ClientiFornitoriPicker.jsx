import { useEffect, useMemo, useRef, useState } from "react";
import { fetchClientiFornitori } from "./api.js";
import { CLIENTI_FORNITORI_TYPE_OPTIONS, getTypeLabel } from "./types.js";

/**
 * @param {{
 *  onSelectRecord?: (record: any) => void,
 *  selectedCod?: number | null,
 *  autoSelectFirst?: boolean,
 *  className?: string
 * }} props
 */
export default function ClientiFornitoriPicker({
  onSelectRecord,
  selectedCod = null,
  autoSelectFirst = false,
  className = ""
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipo, setTipo] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("api");
  const [internalSelectedCod, setInternalSelectedCod] = useState(selectedCod);
  const abortRef = useRef(null);

  const effectiveSelectedCod = selectedCod ?? internalSelectedCod;

  const selectedRecord = useMemo(
    () => rows.find((row) => Number(row.cod) === Number(effectiveSelectedCod)) || null,
    [rows, effectiveSelectedCod]
  );

  const loadRows = async () => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // noop
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const result = await fetchClientiFornitori({
        search: debouncedSearch,
        tipo,
        limit: 500,
        signal: controller.signal
      });
      setRows(Array.isArray(result.data) ? result.data : []);
      setSource(result.source || "api");
      if (result.error) setError(result.error);
    } catch (loadError) {
      if (loadError?.name === "AbortError") return;
      setRows([]);
      setSource("api");
      setError(loadError instanceof Error ? loadError.message : "Errore caricamento anagrafiche");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSelect = (record) => {
    if (selectedCod == null) {
      setInternalSelectedCod(record.cod);
    }
    if (onSelectRecord) onSelectRecord(record);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(String(search || "").trim());
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadRows();
  }, [debouncedSearch, tipo]);

  useEffect(() => {
    if (!autoSelectFirst) return;
    if (selectedRecord) return;
    if (rows.length === 0) return;
    handleSelect(rows[0]);
  }, [autoSelectFirst, rows, selectedRecord]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {
          // noop
        }
      }
    };
  }, []);

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="ui-control flex items-center px-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-60"
              aria-label="Aggiorna elenco"
            >
              <i className={`fa-solid fa-rotate-right text-[12px] ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
            <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
            <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ricerca per nominativo, P.IVA, citta, PEC"
              className="ml-3 h-full w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="ui-select-wrap">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="ui-control ui-select min-w-[170px] px-3 text-sm"
          >
            {CLIENTI_FORNITORI_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
        </div>
      </div>

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
      {source === "mock" ? (
        <p className="text-xs text-amber-500">Sorgente fallback mock attiva (API non raggiungibile).</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
        <table className="warehouse-table table-dense w-full min-w-[860px] table-fixed text-xs lg:min-w-0">
          <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              <th className="w-[12%] px-3 py-2">Tipo</th>
              <th className="w-[30%] px-3 py-2">Nominativo</th>
              <th className="w-[20%] px-3 py-2">P.IVA / C.F.</th>
              <th className="w-[14%] px-3 py-2">Citta</th>
              <th className="w-[24%] px-3 py-2">Contatti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = Number(row.cod) === Number(effectiveSelectedCod);
              return (
                <tr
                  key={row.cod}
                  onClick={() => handleSelect(row)}
                  className={`cursor-pointer border-t border-[var(--border)] ${isSelected ? "bg-emerald-500/10" : ""}`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        row.tipo === "cliente"
                          ? "bg-sky-500/20 text-sky-400"
                          : row.tipo === "fornitore"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {getTypeLabel(row.tipo)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-sky-400">
                    <span className="block truncate" title={row.nominativo || ""}>
                      {row.nominativo || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.piva || row.codFiscale || "-"}</td>
                  <td className="px-3 py-2">{row.citta || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="block truncate" title={row.email || row.pec || row.telefoni || ""}>
                      {row.email || row.pec || row.telefoni || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-xs text-[var(--muted)]">
                  Nessuna anagrafica trovata.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
