import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import { ClientiFornitoriPicker } from "../features/clienti-fornitori/index.js";
import ankeLogo from "../assets/Anke.ico";
import htsmedLogo from "../assets/HTS-Med-logo.png";
import iamerLogo from "../assets/iamers-news.jpg";
import iso9001Logo from "../assets/91_ISO9001_rgb_120.gif";
import jasAnzLogo from "../assets/JAS-ANZ-LOGO-MDQMS-e1643900679772.jpg";
import certExtraLogo from "../assets/download.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const STATUS_OPTIONS = ["ALL", "VALIDATO", "BOZZA"];
const WIZARD_STEPS = [
  { id: "anagrafica", label: "Anagrafica cliente" },
  { id: "magazzino", label: "Codice magazzino" },
  { id: "pagamento", label: "Tipo pagamento" },
  { id: "offerta", label: "Tipo offerta" },
  { id: "riepilogo", label: "Riepilogo" }
];
const PAYMENT_TYPES = ["Bonifico 30 gg", "Bonifico 60 gg", "RIBA 30 gg", "RIBA 60 gg", "Contanti", "Carta"];
const OFFER_TYPES = [
  {
    id: "standard",
    label: "Standard",
    clauses:
      "Pagamento entro i termini concordati. Consegna franco magazzino venditore salvo accordi scritti. Eventuali resi previa autorizzazione."
  },
  {
    id: "service",
    label: "Service",
    clauses:
      "Interventi programmati inclusi. SLA di presa in carico entro 8 ore lavorative. Parti di consumo escluse se non diversamente pattuito."
  },
  {
    id: "noleggio",
    label: "Noleggio",
    clauses:
      "Canone mensile anticipato. Manutenzione ordinaria inclusa nel canone. Danni da uso improprio esclusi e fatturati separatamente."
  }
];

const EMPTY_MANUAL_CUSTOMER = {
  nominativo: "",
  piva: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  email: "",
  telefono: ""
};

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
  const [offerWizardOpen, setOfferWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardCustomerMode, setWizardCustomerMode] = useState("manual");
  const [wizardManualCustomer, setWizardManualCustomer] = useState(EMPTY_MANUAL_CUSTOMER);
  const [wizardSelectedParty, setWizardSelectedParty] = useState(null);
  const [wizardWarehouseSearch, setWizardWarehouseSearch] = useState("");
  const [wizardWarehouseRows, setWizardWarehouseRows] = useState([]);
  const [wizardWarehouseLoading, setWizardWarehouseLoading] = useState(false);
  const [wizardWarehouseError, setWizardWarehouseError] = useState("");
  const [wizardSelectedWarehouse, setWizardSelectedWarehouse] = useState(null);
  const [wizardQuantity, setWizardQuantity] = useState(1);
  const [wizardPaymentType, setWizardPaymentType] = useState("");
  const [wizardOfferType, setWizardOfferType] = useState("");
  const [wizardNotes, setWizardNotes] = useState("");
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
    if (!detailModalOpen && !offerWizardOpen) return;
    const onEsc = (event) => {
      if (event.key !== "Escape") return;
      if (offerWizardOpen) {
        setOfferWizardOpen(false);
        return;
      }
      setDetailModalOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [detailModalOpen, offerWizardOpen]);

  useEffect(() => {
    if (!offerWizardOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setWizardWarehouseLoading(true);
      setWizardWarehouseError("");
      try {
        const params = new URLSearchParams({ limit: "220" });
        const trimmed = String(wizardWarehouseSearch || "").trim();
        if (trimmed) params.set("search", trimmed);
        const res = await fetch(`${API_BASE}/api/warehouse/articoli?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Errore caricamento codici di magazzino.");
        const payload = await res.json();
        setWizardWarehouseRows(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setWizardWarehouseRows([]);
        setWizardWarehouseError(err?.message || "Errore caricamento codici di magazzino.");
      } finally {
        setWizardWarehouseLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [offerWizardOpen, wizardWarehouseSearch]);

  const openDetailModal = (cod) => {
    if (!cod) return;
    setSelectedCod(cod);
    setConditionsTab("fornitura");
    setDetailModalOpen(true);
  };

  const openOfferWizard = () => {
    setWizardStep(0);
    setWizardCustomerMode("manual");
    setWizardManualCustomer(EMPTY_MANUAL_CUSTOMER);
    setWizardSelectedParty(null);
    setWizardWarehouseSearch("");
    setWizardWarehouseRows([]);
    setWizardWarehouseError("");
    setWizardSelectedWarehouse(null);
    setWizardQuantity(1);
    setWizardPaymentType("");
    setWizardOfferType("");
    setWizardNotes("");
    setOfferWizardOpen(true);
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

  const selectedOfferType = useMemo(
    () => OFFER_TYPES.find((item) => item.id === wizardOfferType) || null,
    [wizardOfferType]
  );

  const wizardPreviewCustomer = useMemo(() => {
    if (wizardCustomerMode === "manual") return wizardManualCustomer;
    if (!wizardSelectedParty) return EMPTY_MANUAL_CUSTOMER;
    return {
      nominativo: wizardSelectedParty.nominativo || "",
      piva: wizardSelectedParty.piva || "",
      indirizzo: wizardSelectedParty.indirizzo || "",
      citta: wizardSelectedParty.citta || "",
      cap: wizardSelectedParty.cap || "",
      provincia: wizardSelectedParty.provincia || "",
      email: wizardSelectedParty.email || "",
      telefono: wizardSelectedParty.telefoni || ""
    };
  }, [wizardCustomerMode, wizardManualCustomer, wizardSelectedParty]);

  const wizardValidation = useMemo(() => {
    const errors = { anagrafica: "", magazzino: "", pagamento: "", offerta: "" };
    if (wizardCustomerMode === "manual") {
      if (!String(wizardManualCustomer.nominativo || "").trim()) {
        errors.anagrafica = "Inserisci almeno il nominativo cliente.";
      }
    } else if (!wizardSelectedParty) {
      errors.anagrafica = "Seleziona un cliente/fornitore.";
    }
    if (!wizardSelectedWarehouse) errors.magazzino = "Seleziona un codice di magazzino.";
    if (!wizardPaymentType) errors.pagamento = "Seleziona un tipo di pagamento.";
    if (!wizardOfferType) errors.offerta = "Seleziona un tipo offerta.";
    return errors;
  }, [
    wizardCustomerMode,
    wizardManualCustomer.nominativo,
    wizardOfferType,
    wizardPaymentType,
    wizardSelectedParty,
    wizardSelectedWarehouse
  ]);

  const canGoStep = (idx) => {
    if (idx === 0) return !wizardValidation.anagrafica;
    if (idx === 1) return !wizardValidation.magazzino;
    if (idx === 2) return !wizardValidation.pagamento;
    if (idx === 3) return !wizardValidation.offerta;
    return true;
  };

  const changeWizardStep = (targetIndex) => {
    const next = Math.min(Math.max(targetIndex, 0), WIZARD_STEPS.length - 1);
    if (next <= wizardStep) {
      setWizardStep(next);
      return;
    }
    for (let idx = 0; idx < next; idx += 1) {
      if (!canGoStep(idx)) {
        setWizardStep(idx);
        return;
      }
    }
    setWizardStep(next);
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const wizardStepId = WIZARD_STEPS[wizardStep]?.id || "anagrafica";
  const wizardDateLabel = useMemo(
    () => new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()),
    []
  );

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

          <button
            type="button"
            onClick={openOfferWizard}
            className="ui-control inline-flex h-10 w-10 items-center justify-center text-sm font-semibold"
            aria-label="Nuova offerta guidata"
            title="Nuova offerta guidata"
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
          </button>
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

      {offerWizardOpen ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/80 px-0 py-0 sm:px-4"
          onMouseDown={() => setOfferWizardOpen(false)}
        >
          <div
            className="flex h-[92dvh] max-h-[92dvh] w-full max-w-[1820px] min-h-0 flex-col overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:rounded-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Nuova offerta</p>
                <h2 className="mt-1 text-lg font-semibold">Wizard guidato</h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setOfferWizardOpen(false)}
                aria-label="Chiudi wizard"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:grid-cols-1 sm:p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
              <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-1.5">
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="flex min-w-max items-center gap-1 px-1">
                      {WIZARD_STEPS.map((step, index) => {
                        const isActive = index === wizardStep;
                        const isDone = index < wizardStep && canGoStep(index);
                        const connectorDone = index < wizardStep;
                        return (
                          <div key={step.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => changeWizardStep(index)}
                              className={`inline-flex h-8 items-center gap-2 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition ${
                                isActive
                                  ? "border-emerald-500 bg-emerald-500/10 text-[var(--page-fg)]"
                                  : isDone
                                    ? "border-sky-400/70 bg-sky-500/10 text-[var(--page-fg)]"
                                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
                              }`}
                            >
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                                  isActive
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                                    : isDone
                                      ? "border-sky-400/80 bg-sky-500/20 text-sky-300"
                                      : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]"
                                }`}
                              >
                                {isDone ? <i className="fa-solid fa-check" aria-hidden="true" /> : index + 1}
                              </span>
                              <span>{step.label}</span>
                            </button>
                            {index < WIZARD_STEPS.length - 1 ? (
                              <span
                                className={`h-px w-6 ${connectorDone ? "bg-emerald-400/70" : "bg-[var(--border)]"}`}
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {wizardStepId === "anagrafica" ? (
                    <div className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setWizardCustomerMode("manual");
                          setWizardSelectedParty(null);
                        }}
                        className={`inline-flex h-7 items-center rounded px-2.5 text-xs font-medium transition ${
                          wizardCustomerMode === "manual"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        Manuale
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardCustomerMode("db")}
                        className={`inline-flex h-7 items-center rounded px-2.5 text-xs font-medium transition ${
                          wizardCustomerMode === "db"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        Da DB
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                  {wizardStepId === "anagrafica" ? (
                    <div className="space-y-3">
                      {wizardCustomerMode === "manual" ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Nominativo
                            <input
                              type="text"
                              value={wizardManualCustomer.nominativo}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, nominativo: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            P.IVA
                            <input
                              type="text"
                              value={wizardManualCustomer.piva}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, piva: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] md:col-span-2">
                            Indirizzo
                            <input
                              type="text"
                              value={wizardManualCustomer.indirizzo}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, indirizzo: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Citta
                            <input
                              type="text"
                              value={wizardManualCustomer.citta}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, citta: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            CAP
                            <input
                              type="text"
                              value={wizardManualCustomer.cap}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, cap: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Provincia
                            <input
                              type="text"
                              value={wizardManualCustomer.provincia}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, provincia: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Email
                            <input
                              type="text"
                              value={wizardManualCustomer.email}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, email: event.target.value }))}
                              className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="min-h-0 rounded-md border border-[var(--border)] p-2">
                          <ClientiFornitoriPicker onSelectRecord={setWizardSelectedParty} selectedCod={wizardSelectedParty?.cod || null} />
                        </div>
                      )}

                      {wizardValidation.anagrafica ? <p className="text-sm text-amber-500">{wizardValidation.anagrafica}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "magazzino" ? (
                    <div className="space-y-3">
                      <div className="ui-control flex items-center px-2">
                        <i className="fa-solid fa-boxes-stacked text-[12px] text-[var(--muted)]" aria-hidden="true" />
                        <input
                          type="text"
                          value={wizardWarehouseSearch}
                          onChange={(event) => setWizardWarehouseSearch(event.target.value)}
                          placeholder="Ricerca codice o descrizione"
                          className="ml-3 h-full w-full bg-transparent text-sm outline-none"
                        />
                      </div>
                      {wizardWarehouseError ? <p className="text-sm text-rose-500">{wizardWarehouseError}</p> : null}

                      <div className="rounded-md border border-[var(--border)]">
                        <div className="max-h-[320px] overflow-auto">
                          <table className="table-dense w-full min-w-[760px] table-fixed text-xs">
                            <thead className="sticky top-0 bg-[var(--surface-strong)]">
                              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                                <th className="w-[22%] px-3 py-2">Codice</th>
                                <th className="w-[46%] px-3 py-2">Descrizione</th>
                                <th className="w-[16%] px-3 py-2">Centro</th>
                                <th className="w-[16%] px-3 py-2">Azione</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wizardWarehouseRows.map((item) => {
                                const isSelected = String(item.codiceArticolo || "") === String(wizardSelectedWarehouse?.codiceArticolo || "");
                                return (
                                  <tr key={String(item.codiceArticolo)} className={`border-t border-[var(--border)] ${isSelected ? "bg-emerald-500/10" : ""}`}>
                                    <td className="px-3 py-2 font-semibold text-sky-400">{item.codiceArticolo || "-"}</td>
                                    <td className="px-3 py-2">{item.descrizione || "-"}</td>
                                    <td className="px-3 py-2">{item.centroDiCosto || "-"}</td>
                                    <td className="px-3 py-2">
                                      <button
                                        type="button"
                                        onClick={() => setWizardSelectedWarehouse(item)}
                                        className="ui-control h-8 px-2 text-[11px]"
                                      >
                                        {isSelected ? "Selezionato" : "Seleziona"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {!wizardWarehouseLoading && wizardWarehouseRows.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
                                    Nessun codice trovato.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Quantita
                        <input
                          type="number"
                          min="1"
                          value={wizardQuantity}
                          onChange={(event) => setWizardQuantity(Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1))}
                          className="ui-control mt-1 w-[140px] px-3 text-sm"
                        />
                      </label>
                      {wizardValidation.magazzino ? <p className="text-sm text-amber-500">{wizardValidation.magazzino}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "pagamento" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--muted)]">Seleziona la condizione di pagamento.</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {PAYMENT_TYPES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setWizardPaymentType(item)}
                            className={`ui-control px-3 text-left text-sm ${wizardPaymentType === item ? "border-emerald-500 bg-emerald-500/10" : ""}`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      {wizardValidation.pagamento ? <p className="text-sm text-amber-500">{wizardValidation.pagamento}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "offerta" ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        {OFFER_TYPES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setWizardOfferType(item.id)}
                            className={`rounded-md border px-3 py-2 text-left text-sm ${wizardOfferType === item.id ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--border)] hover:bg-[var(--hover)]"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Clausole precompilate
                        <textarea
                          readOnly
                          value={selectedOfferType?.clauses || ""}
                          className="mt-1 h-32 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Note interne
                        <textarea
                          value={wizardNotes}
                          onChange={(event) => setWizardNotes(event.target.value)}
                          className="mt-1 h-24 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        />
                      </label>
                      {wizardValidation.offerta ? <p className="text-sm text-amber-500">{wizardValidation.offerta}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "riepilogo" ? (
                    <div className="space-y-3 text-sm">
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Cliente</p>
                        <p className="mt-1 font-semibold">{wizardPreviewCustomer.nominativo || "-"}</p>
                        <p className="text-[var(--muted)]">P.IVA: {wizardPreviewCustomer.piva || "-"}</p>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Fornitura</p>
                        <p className="mt-1 font-semibold">
                          {wizardSelectedWarehouse
                            ? `${wizardSelectedWarehouse.codiceArticolo || "-"} - ${wizardSelectedWarehouse.descrizione || "-"}`
                            : "-"}
                        </p>
                        <p className="text-[var(--muted)]">Quantita: {wizardQuantity}</p>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Condizioni</p>
                        <p>Pagamento: <span className="font-semibold">{wizardPaymentType || "-"}</span></p>
                        <p>Tipo offerta: <span className="font-semibold">{selectedOfferType?.label || "-"}</span></p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    onClick={() => changeWizardStep(wizardStep - 1)}
                    disabled={wizardStep === 0}
                    className="ui-control px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={() => changeWizardStep(wizardStep + 1)}
                    disabled={wizardStep >= WIZARD_STEPS.length - 1 || !canGoStep(wizardStep)}
                    className="ui-control px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Avanti
                  </button>
                </div>
              </section>

              <aside className="flex min-h-0 min-w-0 flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Anteprima offerta</p>
                <p className="text-xs text-[var(--muted)]">Carta intestata stile DDT</p>
                <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] bg-slate-100/60 p-3">
                  <div className="mx-auto mb-3 w-full max-w-[820px] bg-white p-6 text-black shadow-sm">
                    <div className="border border-[#9ca3af]">
                      <div className="grid min-h-[66px] grid-cols-2 items-center px-4 py-2">
                        <div className="flex items-center">
                          <img src={htsmedLogo} alt="HTSMED" className="max-h-10 max-w-[150px] object-contain" />
                        </div>
                        <div className="flex justify-end">
                          <img src={ankeLogo} alt="ANKE" className="max-h-9 max-w-[120px] object-contain" />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_108px_88px] bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">
                        <div>OFFERTA COMMERCIALE</div>
                        <div className="border-l border-white/60 text-center">{selectedOfferType?.label?.toUpperCase() || "-"}</div>
                        <div className="border-l border-white/60 text-center">{wizardDateLabel || "-"}</div>
                      </div>
                      <div className="border-t border-[#9ca3af] bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">MITTENTE/CEDENTE</div>
                      <div className="grid grid-cols-[1fr_180px] border-t border-[#9ca3af] text-[11px] font-semibold italic">
                        <div className="px-2 py-1">HTS MED S.R.L. - Partita IVA: 02759040641</div>
                        <div className="border-l border-[#9ca3af] px-2 py-1 text-right">Via Napoli 350 - Castellammare di Stabia (NA) 80053</div>
                      </div>
                      <div className="border-t border-[#9ca3af] bg-[#0b8fd1] px-2 py-1 text-right text-[11px] font-bold italic text-white">DESTINATARIO</div>
                      <div className="grid grid-cols-[1fr_180px] border-t border-[#9ca3af] text-[11px] font-semibold italic">
                        <div className="px-2 py-1">
                          {(wizardPreviewCustomer.nominativo || "-") + " - Partita IVA: " + (wizardPreviewCustomer.piva || "-")}
                        </div>
                        <div className="border-l border-[#9ca3af] px-2 py-1 text-right">
                          {[wizardPreviewCustomer.indirizzo || "-", wizardPreviewCustomer.cap, wizardPreviewCustomer.citta, wizardPreviewCustomer.provincia]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      </div>
                      <div className="border-t border-[#9ca3af] bg-[#0b8fd1] px-2 py-1 text-right text-[11px] font-bold italic text-white">Indirizzo Destinazione Merce:</div>
                      <div className="border-t border-[#9ca3af] px-2 py-1 text-[11px] font-semibold italic">
                        {[wizardPreviewCustomer.indirizzo || "-", wizardPreviewCustomer.cap, wizardPreviewCustomer.citta, wizardPreviewCustomer.provincia]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                      <div className="border-t border-[#9ca3af] bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">CONDIZIONI COMMERCIALI</div>
                      <div className="border-t border-[#9ca3af] px-2 py-1 text-[11px] font-semibold italic">
                        Pagamento: {wizardPaymentType || "-"} | Tipo offerta: {selectedOfferType?.label || "-"}
                      </div>
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-[#0b8fd1] text-left text-white">
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Codice:</th>
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Descrizione:</th>
                            <th className="border border-[#9ca3af] px-1 py-1 text-right font-bold italic">qt</th>
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-[#9ca3af] px-1 py-1">{wizardSelectedWarehouse?.codiceArticolo || "-"}</td>
                            <td className="border border-[#9ca3af] px-1 py-1">{wizardSelectedWarehouse?.descrizione || "-"}</td>
                            <td className="border border-[#9ca3af] px-1 py-1 text-right">{wizardQuantity || 0}</td>
                            <td className="border border-[#9ca3af] px-1 py-1">{selectedOfferType?.label || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="min-h-[120px]" />
                    <div className="border border-[#9ca3af] border-t-0">
                      <div className="bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">CLAUSOLE</div>
                      <div className="min-h-[72px] px-2 py-1 text-[11px] font-semibold italic whitespace-pre-wrap">
                        {selectedOfferType?.clauses || "-"}
                      </div>
                      <div className="grid grid-cols-2 border-t border-[#9ca3af]">
                        <div className="border-r border-[#9ca3af]">
                          <div className="bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">NOTE INTERNE</div>
                          <div className="min-h-[52px] px-2 py-1 text-[11px] font-semibold italic whitespace-pre-wrap">
                            {wizardNotes || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">FIRMA HTS MED</div>
                          <div className="min-h-[30px] border-t border-[#9ca3af]" />
                          <div className="bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">FIRMA CLIENTE</div>
                          <div className="min-h-[30px] border-t border-[#9ca3af]" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_1fr_170px] gap-2 border-t border-[#9ca3af] pt-2 text-[9px] text-[#1f2937]">
                      <div>
                        <strong>Sede Legale:</strong>
                        <br />
                        Via Napoli 350 - 80053
                        <br />
                        Castellammare di Stabia (NA)
                        <br />
                        P. IVA: 02759040641
                      </div>
                      <div>
                        <strong>Sede Operativa:</strong>
                        <br />
                        Via Napoli 350 - 80053
                        <br />
                        Castellammare di Stabia (NA)
                        <br />
                        www.htsmed.com
                      </div>
                      <div className="flex flex-wrap items-end justify-end gap-1.5">
                        <img src={iamerLogo} alt="IAMER" className="max-h-6 max-w-[52px] object-contain" />
                        <img src={iso9001Logo} alt="ISO 9001" className="max-h-6 max-w-[52px] object-contain" />
                        <img src={jasAnzLogo} alt="JAS ANZ" className="max-h-6 max-w-[52px] object-contain" />
                        <img src={certExtraLogo} alt="Certificazioni" className="max-h-6 max-w-[52px] object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

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
