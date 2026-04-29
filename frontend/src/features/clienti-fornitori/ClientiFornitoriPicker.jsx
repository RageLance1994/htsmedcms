import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createClienteFornitore,
  deleteClienteFornitore,
  fetchClientiFornitori,
  updateClienteFornitore
} from "./api.js";
import { CLIENTI_FORNITORI_TYPE_OPTIONS, getTypeLabel } from "./types.js";

const WIZARD_DRAFT_STORAGE_KEY = "offerte_wizard_draft_v1";
const DELETE_CONFIRM_TOKEN = "ELIMINA";

const EMPTY_FORM = {
  tipo: "cliente",
  nominativo: "",
  piva: "",
  codFiscale: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  regione: "",
  telefoni: "",
  email: "",
  pec: "",
  agenziaRiferimento: "",
  note: ""
};

const MODAL_TYPE_OPTIONS = CLIENTI_FORNITORI_TYPE_OPTIONS.filter((option) => option.value !== "all");

const normalizePosition = (event, menuWidth, menuHeight) => {
  const pad = 8;
  const rawX = Number(event?.clientX || 0);
  const rawY = Number(event?.clientY || 0);
  const maxX = window.innerWidth - menuWidth - pad;
  const maxY = window.innerHeight - menuHeight - pad;
  return {
    x: Math.max(pad, Math.min(rawX, maxX)),
    y: Math.max(pad, Math.min(rawY, maxY))
  };
};

const recordToForm = (row) => ({
  tipo: String(row?.tipo || "cliente").trim().toLowerCase() || "cliente",
  nominativo: String(row?.nominativo || "").trim(),
  piva: String(row?.piva || "").trim(),
  codFiscale: String(row?.codFiscale || "").trim(),
  indirizzo: String(row?.indirizzo || "").trim(),
  citta: String(row?.citta || "").trim(),
  cap: String(row?.cap || "").trim(),
  provincia: String(row?.provincia || "").trim().toUpperCase(),
  regione: String(row?.regione || "").trim(),
  telefoni: String(row?.telefoni || "").trim(),
  email: String(row?.email || "").trim(),
  pec: String(row?.pec || "").trim(),
  agenziaRiferimento: String(row?.agenziaRiferimento || "").trim(),
  note: String(row?.note || "").trim()
});

const formToPayload = (form) => ({
  tipo: String(form?.tipo || "cliente").trim().toLowerCase(),
  nominativo: String(form?.nominativo || "").trim(),
  piva: String(form?.piva || "").trim(),
  codFiscale: String(form?.codFiscale || "").trim(),
  indirizzo: String(form?.indirizzo || "").trim(),
  citta: String(form?.citta || "").trim(),
  cap: String(form?.cap || "").trim(),
  provincia: String(form?.provincia || "").trim().toUpperCase(),
  regione: String(form?.regione || "").trim(),
  telefoni: String(form?.telefoni || "").trim(),
  email: String(form?.email || "").trim(),
  pec: String(form?.pec || "").trim(),
  agenziaRiferimento: String(form?.agenziaRiferimento || "").trim(),
  note: String(form?.note || "").trim()
});

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipo, setTipo] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("api");
  const [internalSelectedCod, setInternalSelectedCod] = useState(selectedCod);
  const [actionError, setActionError] = useState("");

  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, row: null });
  const [formModal, setFormModal] = useState({ open: false, mode: "create", row: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteModal, setDeleteModal] = useState({ open: false, row: null });
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const abortRef = useRef(null);

  const effectiveSelectedCod = selectedCod ?? internalSelectedCod;
  const deferredRows = useDeferredValue(rows);

  const selectedRecord = useMemo(
    () => rows.find((row) => Number(row.cod) === Number(effectiveSelectedCod)) || null,
    [rows, effectiveSelectedCod]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0, row: null });
  }, []);

  const loadRows = useCallback(async () => {
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
  }, [debouncedSearch, tipo]);

  const handleSelect = useCallback((record) => {
    if (selectedCod == null) {
      setInternalSelectedCod(record.cod);
    }
    if (onSelectRecord) onSelectRecord(record);
  }, [onSelectRecord, selectedCod]);

  const openCreateModal = () => {
    closeContextMenu();
    setFormModal({ open: true, mode: "create", row: null });
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const openEditModal = (row) => {
    if (!row) return;
    closeContextMenu();
    setFormModal({ open: true, mode: "edit", row });
    setForm(recordToForm(row));
    setFormError("");
  };

  const openDeleteModal = (row) => {
    if (!row) return;
    closeContextMenu();
    setDeleteModal({ open: true, row });
    setDeleteConfirmValue("");
    setDeleteError("");
  };

  const openContextMenu = useCallback((event, row) => {
    if (!row) return;
    const position = normalizePosition(event, 240, 144);
    handleSelect(row);
    setContextMenu({ open: true, x: position.x, y: position.y, row });
  }, [handleSelect]);

  const saveForm = async () => {
    const payload = formToPayload(form);
    if (!payload.nominativo) {
      setFormError("Nominativo obbligatorio");
      return;
    }
    if (!payload.piva) {
      setFormError("P.IVA obbligatoria");
      return;
    }

    setFormSaving(true);
    setFormError("");
    setActionError("");
    try {
      let result;
      if (formModal.mode === "edit") {
        const cod = Number(formModal.row?.cod);
        result = await updateClienteFornitore(cod, payload);
      } else {
        result = await createClienteFornitore(payload);
      }

      const nextCod = Number(result?.record?.cod || 0);
      if (Number.isFinite(nextCod) && nextCod > 0) {
        if (selectedCod == null) setInternalSelectedCod(nextCod);
      }

      setFormModal({ open: false, mode: "create", row: null });
      await loadRows();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Errore salvataggio anagrafica");
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = async () => {
    const row = deleteModal.row;
    if (!row) return;
    setDeleteLoading(true);
    setDeleteError("");
    setActionError("");
    try {
      await deleteClienteFornitore(row.cod);
      if (Number(selectedCod ?? internalSelectedCod) === Number(row.cod) && selectedCod == null) {
        setInternalSelectedCod(null);
      }
      setDeleteModal({ open: false, row: null });
      setDeleteConfirmValue("");
      await loadRows();
    } catch (deleteActionError) {
      setDeleteError(deleteActionError instanceof Error ? deleteActionError.message : "Errore eliminazione anagrafica");
    } finally {
      setDeleteLoading(false);
    }
  };

  const createOfferFromRow = (row) => {
    if (!row) return;
    closeContextMenu();
    setActionError("");

    const draft = {
      wizardStep: 0,
      wizardManualCustomer: {
        nominativo: String(row.nominativo || "").trim(),
        piva: String(row.piva || "").trim(),
        indirizzo: String(row.indirizzo || "").trim(),
        citta: String(row.citta || "").trim(),
        cap: String(row.cap || "").trim(),
        provincia: String(row.provincia || "").trim(),
        email: String(row.email || "").trim(),
        telefono: String(row.telefoni || "").trim()
      },
      wizardWarehouseSearch: "",
      wizardWarehouseSelectedCode: "",
      wizardCartRows: [],
      wizardPaymentType: "",
      wizardPaymentTerms: "",
      wizardOfferType: "",
      wizardClauseText: "",
      wizardNotes: ""
    };

    try {
      localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore localStorage failures and fallback to query/state only
    }

    const params = new URLSearchParams({
      from: "clienti-fornitori",
      openWizard: "1",
      clienteCod: String(row.cod || ""),
      tipo: String(row.tipo || ""),
      nominativo: String(row.nominativo || "")
    });

    navigate(`/offerte?${params.toString()}`, {
      state: {
        source: "clienti-fornitori",
        openWizard: true,
        prefillCustomer: {
          cod: row.cod,
          nominativo: row.nominativo,
          tipo: row.tipo,
          piva: row.piva,
          indirizzo: row.indirizzo,
          citta: row.citta,
          cap: row.cap,
          provincia: row.provincia,
          email: row.email,
          telefoni: row.telefoni
        }
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(String(search || "").trim());
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

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

  useEffect(() => {
    if (!contextMenu.open) return undefined;
    const closeByEsc = (event) => {
      if (event.key === "Escape") closeContextMenu();
    };
    const close = () => closeContextMenu();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeByEsc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeByEsc);
    };
  }, [contextMenu.open]);

  const deleteEnabled = String(deleteConfirmValue || "").trim().toUpperCase() === DELETE_CONFIRM_TOKEN;
  const tableBodyRows = useMemo(() => {
    return deferredRows.map((row) => {
      const isSelected = Number(row.cod) === Number(effectiveSelectedCod);
      return (
        <tr
          key={row.cod}
          onClick={(event) => openContextMenu(event, row)}
          onContextMenu={(event) => {
            event.preventDefault();
            openContextMenu(event, row);
          }}
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
          <td className="px-3 py-2 text-right">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openContextMenu(event, row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)]"
              aria-label="Apri azioni"
            >
              <i className="fa-solid fa-ellipsis-vertical text-xs" aria-hidden="true" />
            </button>
          </td>
        </tr>
      );
    });
  }, [deferredRows, effectiveSelectedCod, openContextMenu]);

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

        <button
          type="button"
          onClick={openCreateModal}
          className="ui-control inline-flex h-10 w-10 items-center justify-center border-emerald-500/40 bg-emerald-500/15 text-lg font-semibold text-emerald-300 hover:bg-emerald-500/25"
          aria-label="Nuovo cliente/fornitore"
          title="Nuovo cliente/fornitore"
        >
          +
        </button>
      </div>

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
      {actionError ? <p className="text-xs text-rose-500">{actionError}</p> : null}
      {source === "mock" ? (
        <p className="text-xs text-amber-500">Sorgente fallback mock attiva (API non raggiungibile).</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
        <table className="warehouse-table table-dense w-full min-w-[940px] table-fixed text-xs lg:min-w-0">
          <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              <th className="w-[11%] px-3 py-2">Tipo</th>
              <th className="w-[29%] px-3 py-2">Nominativo</th>
              <th className="w-[20%] px-3 py-2">P.IVA / C.F.</th>
              <th className="w-[14%] px-3 py-2">Citta</th>
              <th className="w-[22%] px-3 py-2">Contatti</th>
              <th className="w-[4%] px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tableBodyRows}
            {!loading && deferredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-xs text-[var(--muted)]">
                  Nessuna anagrafica trovata.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {contextMenu.open ? (
        <div
          className="fixed z-[120] w-[240px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-2xl"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--hover)]"
            onClick={() => createOfferFromRow(contextMenu.row)}
          >
            <i className="fa-solid fa-file-circle-plus w-4 text-emerald-300" aria-hidden="true" />
            Crea Offerta
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--hover)]"
            onClick={() => openEditModal(contextMenu.row)}
          >
            <i className="fa-solid fa-pen-to-square w-4 text-sky-300" aria-hidden="true" />
            Modifica
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--hover)]"
            onClick={() => openDeleteModal(contextMenu.row)}
          >
            <i className="fa-solid fa-trash-can w-4 text-rose-400" aria-hidden="true" />
            Elimina
          </button>
        </div>
      ) : null}

      {formModal.open ? (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 px-3 py-3 sm:items-center sm:px-4 sm:py-8"
          onMouseDown={() => setFormModal({ open: false, mode: "create", row: null })}
        >
          <div
            className="my-auto flex w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-4rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
              <h2 className="text-xl font-semibold">
                {formModal.mode === "edit" ? "Modifica cliente/fornitore" : "Registra cliente/fornitore"}
              </h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setFormModal({ open: false, mode: "create", row: null })}
                aria-label="Chiudi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Tipo</span>
                  <div className="ui-select-wrap mt-2">
                    <select
                      value={form.tipo}
                      onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                      className="ui-control ui-select w-full px-3 text-sm"
                    >
                      {MODAL_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
                  </div>
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Nominativo *</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.nominativo}
                    onChange={(event) => setForm((prev) => ({ ...prev, nominativo: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">P.IVA *</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.piva}
                    onChange={(event) => setForm((prev) => ({ ...prev, piva: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Codice Fiscale</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.codFiscale}
                    onChange={(event) => setForm((prev) => ({ ...prev, codFiscale: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Indirizzo</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.indirizzo}
                    onChange={(event) => setForm((prev) => ({ ...prev, indirizzo: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Citta</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.citta}
                    onChange={(event) => setForm((prev) => ({ ...prev, citta: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">CAP</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.cap}
                    onChange={(event) => setForm((prev) => ({ ...prev, cap: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Provincia</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.provincia}
                    onChange={(event) => setForm((prev) => ({ ...prev, provincia: event.target.value.toUpperCase() }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                    maxLength={2}
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Regione</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.regione}
                    onChange={(event) => setForm((prev) => ({ ...prev, regione: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Telefoni</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.telefoni}
                    onChange={(event) => setForm((prev) => ({ ...prev, telefoni: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Email</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">PEC</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.pec}
                    onChange={(event) => setForm((prev) => ({ ...prev, pec: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Agenzia di Riferimento</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={form.agenziaRiferimento}
                    onChange={(event) => setForm((prev) => ({ ...prev, agenziaRiferimento: event.target.value }))}
                    className="ui-control mt-2 w-full px-3 text-sm"
                  />
                </label>

                <label className="text-sm lg:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Note</span>
                  <textarea
                    autoComplete="off"
                    rows={4}
                    value={form.note}
                    onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
                onClick={() => setFormModal({ open: false, mode: "create", row: null })}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={saveForm}
                disabled={formSaving}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formSaving ? "Salvataggio..." : "Salva e Chiudi"}
              </button>
            </div>
            {formError ? <p className="px-4 pb-4 text-sm text-rose-500 sm:px-6">{formError}</p> : null}
          </div>
        </div>
      ) : null}

      {deleteModal.open ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-3"
          onMouseDown={() => {
            if (deleteLoading) return;
            setDeleteModal({ open: false, row: null });
            setDeleteConfirmValue("");
            setDeleteError("");
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Conferma eliminazione anagrafica</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => {
                  if (deleteLoading) return;
                  setDeleteModal({ open: false, row: null });
                  setDeleteConfirmValue("");
                  setDeleteError("");
                }}
                aria-label="Chiudi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
              <p>
                Stai eliminando: <span className="font-semibold">{deleteModal.row?.nominativo || "-"}</span>
              </p>
              <p className="mt-1">
                Codice: <span className="font-semibold">{deleteModal.row?.cod || "-"}</span>
              </p>
            </div>

            <label className="mt-4 block text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Digita {DELETE_CONFIRM_TOKEN} per confermare
              </span>
              <input
                autoComplete="off"
                type="text"
                value={deleteConfirmValue}
                onChange={(event) => setDeleteConfirmValue(event.target.value)}
                className="ui-control mt-2 w-full px-3 text-sm"
              />
            </label>

            {deleteError ? <p className="mt-3 text-sm text-rose-500">{deleteError}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (deleteLoading) return;
                  setDeleteModal({ open: false, row: null });
                  setDeleteConfirmValue("");
                  setDeleteError("");
                }}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
                disabled={deleteLoading}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!deleteEnabled || deleteLoading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? "Eliminazione..." : "Elimina definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
