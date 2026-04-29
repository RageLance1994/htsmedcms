import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
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
  { id: "clausole", label: "Clausole" },
  { id: "riepilogo", label: "Riepilogo" }
];
const PAYMENT_TYPES = [
  "CONSUNTIVO",
  "CTR DI MANUTENZIONE - MENSILITA' ANTICIPATE",
  "CTR DI MANUTENZIONE BIMESTRI ANTICIPATI",
  "CTR MANUTENZIONE - TRIMESTRI ANTICIPATI",
  "INTERVENTO TECNICO",
  "NOLEGGIO",
  "RICAMBIO- PAGAMENTO 30GG DATA FATTURA",
  "RICAMBIO-PAGAMENTO ANTICIPATO",
  "VENDITA SISTEMA A FORNITORE ESTERO",
  "VENDITA SISTEMA RM",
  "VENDITA SISTEMA TC"
];
const PAYMENT_TERMS_PRESET = {
  CONSUNTIVO: `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
LA VALIDITA' DELLA PRESENTE OFFERTA E' SUBORDINATA ALLA VERIFICA PREVENTIVA DEL SISTEMA.
PAGAMENTO: CANONI MENSILI ANTICIPATI`,
  "CTR DI MANUTENZIONE - MENSILITA' ANTICIPATE": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO:
PAGAMENTO: VISTA FATTURA`,
  "CTR DI MANUTENZIONE BIMESTRI ANTICIPATI": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
LA VALIDITA' DELLA PRESENTE OFFERTA E' SUBORDINATA ALLA VERIFICA PREVENTIVA DEL SISTEMA.
PAGAMENTO: CANONI BIMESTRALI ANTICIPATI`,
  "CTR MANUTENZIONE - TRIMESTRI ANTICIPATI": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
LA VALIDITA' DELLA PRESENTE OFFERTA E' SUBORDINATA ALLA VERIFICA PREVENTIVA DEL SISTEMA.
PAGAMENTO: CANONI TRIMESTRALI ANTICIPATI`,
  "INTERVENTO TECNICO": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
LA VALIDITA' DELLA PRESENTE OFFERTA E' SUBORDINATA ALLA VERIFICA PREVENTIVA DEL SISTEMA.
PAGAMENTO: CANONI TRIMESTRALI ANTICIPATI`,
  NOLEGGIO: `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO:
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO:
TEMPI DI INTERVENTO: DA CONCORDARE:
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
PAGAMENTO: VISTA FATTURA:`,
  "RICAMBIO- PAGAMENTO 30GG DATA FATTURA": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
TRASPORTO: NOSTRO CARICO:
INSTALLAZIONE: VS CARICO:
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE. SALVO IL VENDUTO;
PAGAMENTO: N XX Canoni mensili Posticipati, XX Canoni Anticipati all'ordine (corrispondenti agli ultimi XX canoni di Locazione).
FIDEIUSSIONE: Il Cliente s'impegna a fornire fideiussione per l'intera cifra pari a XXXXXXX EUR oltre iva a copertura del noleggio operativo
RISCATTO: Al termine dei XX mesi il Cliente ha la facolta' di riscattare il sistema per XXX,00 EUR oltre iva.
GARANZIA: N. 12 mesi sui guasti derivanti da uso improprio delle apparecchiature o, comunque, dipendenti da cause diverse dall'uso normale. Sono, altresi', esclusi i guasti riconducibili a caso fortuito o di forza maggiore, da danneggiamenti colposi o dolosi, da alimentazione elettrica o raffreddamento difettosi. Sono, inoltre, esclusi dalla garanzia contrattuale, accessori quali materassini, poggiatesta, pedane, mezzi di contenzione ed accessori per il posizionamento del Paziente, materiali di consumo in genere, fantocci di calibrazione, iniettori, stampanti e videoregistratori, nonche' i collegati alle apparecchiature. Sono esclusi eventuali workstation e sistemi esterni all'apparecchiatura. Nel corso degli interventi di natura preventiva, saranno eseguiti i controlli previsti in check list. Tutti i controlli saranno effettuati secondo gli alti standard qualitativi e con strumenti sottoposti a controlli di qualita' e ricalibrati periodicamente.
NOTA:
Quadro elettrico, opere murarie, di protezionistica, sistemi di condizionamento e di refrigerazione, altre opere elettriche non specificate in offerta, necessarie a rendere i locali idonei ad accogliere le apparecchiature e a rendere idonei i passaggi delle stesse, sono da intendersi di competenza ed a carico dell'acquirente.`,
  "RICAMBIO-PAGAMENTO ANTICIPATO": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO:
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO E PAGAMENTO INCASSATO:
TRASPORTO: NOSTRO CARICO:
MONTAGGIO: NOSTRO CARICO:
TEMPI DI CONSEGNA: DA DEFINIRE IN BASE AD APPROVVIGIONAMENTO PARTI:
N.B.: IL COSTO DELLE PARTI E' DA INTENDERSI CON RESO DELLE PARTI GUASTE. LA MANCATA RESTITUZIONE COMPORTA UN ULTERIORE COSTO PARI AL 100% DEL PREZZO ESPOSTO IN OFFERTA.
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
PAGAMENTO: 100% ANTICIPATO`,
  "VENDITA SISTEMA A FORNITORE ESTERO": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO
TRASPORTO: NOSTRO CARICO:
MONTAGGIO: NOSTRO CARICO:
TEMPI DI CONSEGNA: 7 GG DA ORDINE FORMALIZZATO E BONIFICO RICEVUTO
GARANZIA: 6 MESI SULLE PARTI SOSTITUITE

Il costo delle parti e' da intendersi "CON RESO". La mancata restituzione dei ricambi guasti prevede un ulteriore costo pari al 70% del prezzo esposto in offerta.
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
PAGAMENTO: BONIFICO ANTICIPATO ALL'ORDINE`,
  "VENDITA SISTEMA RM": `WARRANTY: System is sold "AS/IS" (as it is where it is), with NO warranty.
PAYMENT: Full amount in advance.
SHIPPING: within 3 working days after payment received.

See further terms and conditions in the next page.`,
  "VENDITA SISTEMA TC": `IVA: COME DA NORMATIVA VIGENTE. A VS. CARICO:
DECORRENZA: DALL'ACCETTAZIONE ORDINE FORMALIZZATO E ANTICIPO INCASSATO:
TRASPORTO: NOSTRO CARICO:
TEMPI DI CONSEGNA: 90 GG DA "SITE READY" COMUNICATO DAL CLIENTE E VERIFICATO DA HTS MED (SALVO IMPREVISTI):
INSTALLAZIONE: NOSTRO CARICO:
GARANZIA: 12 MESI:
LA GARANZIA PREVEDE: N. 2 MANUTENZIONI PREVENTIVE PER ANNO, INTERVENTI CORRETTIVI ILLIMITATI, ASSISTENZA REMOTA ILLIMITATA, TUTTE LE PARTI DI RICAMBIO INCLUSE.
Non rientrano in garanzia i guasti derivanti da uso improprio delle apparecchiature o, comunque, dipendenti da cause diverse dall'uso normale.
CLINICAL APPLICATION: N. 2 GIORNATE DA PIANIFICARE IN ACCORDO CON IL CLIENTE:
VALIDITA' OFFERTA: 30 GG DALLA DATA DI EMISSIONE DELLA PRESENTE:
NOTA:
Quadro elettrico, opere murarie, compensatore di campo attivo, di protezionistica, sistemi di condizionamento e di refrigerazione, altre opere non specificate in offerta, necessarie a rendere i locali idonei ad accogliere le apparecchiature e a rendere idonei i passaggi delle stesse, sono da intendersi di competenza ed a carico dell'acquirente.
PAGAMENTO:
OPZIONE 1: 30% ANTICIPO. SALDO A MEZZO LEASING:
OPZIONE 2: 40% DI ANTICIPO. 40% AD AVVISO MERCE PRONTA. SALDO AL COLLAUDO:`
};
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
const EMPTY_NEW_CUSTOMER_FORM = {
  nominativo: "",
  piva: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  telefoni: "",
  email: "",
  pec: "",
  note: ""
};
const WIZARD_DRAFT_STORAGE_KEY = "offerte_wizard_draft_v1";
const WIZARD_DRAFT_SAVE_DEBOUNCE_MS = 900;
const WIZARD_SEARCH_DEBOUNCE_MS = 130;
const WIZARD_WAREHOUSE_LIMIT = 120;
const WIZARD_CUSTOMER_LIMIT = 250;
const WIZARD_CACHE_TTL_MS = 60_000;

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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [wizardManualCustomer, setWizardManualCustomer] = useState(EMPTY_MANUAL_CUSTOMER);
  const [wizardCustomerPickerOpen, setWizardCustomerPickerOpen] = useState(false);
  const [wizardCustomerSearch, setWizardCustomerSearch] = useState("");
  const [wizardCustomerSearchDebounced, setWizardCustomerSearchDebounced] = useState("");
  const [wizardCustomerRows, setWizardCustomerRows] = useState([]);
  const [wizardCustomerLoading, setWizardCustomerLoading] = useState(false);
  const [wizardCustomerError, setWizardCustomerError] = useState("");
  const [wizardCustomerSelectedCod, setWizardCustomerSelectedCod] = useState(null);
  const [wizardCustomerCreateOpen, setWizardCustomerCreateOpen] = useState(false);
  const [wizardCustomerCreateLoading, setWizardCustomerCreateLoading] = useState(false);
  const [wizardCustomerCreateError, setWizardCustomerCreateError] = useState("");
  const [wizardNewCustomerForm, setWizardNewCustomerForm] = useState(EMPTY_NEW_CUSTOMER_FORM);
  const [wizardWarehouseSearch, setWizardWarehouseSearch] = useState("");
  const [wizardWarehouseSearchDebounced, setWizardWarehouseSearchDebounced] = useState("");
  const [wizardWarehouseRows, setWizardWarehouseRows] = useState([]);
  const [wizardWarehouseLoading, setWizardWarehouseLoading] = useState(false);
  const [wizardWarehouseError, setWizardWarehouseError] = useState("");
  const [wizardWarehouseSelectedCode, setWizardWarehouseSelectedCode] = useState("");
  const [wizardCartRows, setWizardCartRows] = useState([]);
  const [wizardPaymentType, setWizardPaymentType] = useState("");
  const [wizardPaymentTerms, setWizardPaymentTerms] = useState("");
  const [wizardClauseRows, setWizardClauseRows] = useState([]);
  const [wizardClauseLoading, setWizardClauseLoading] = useState(false);
  const [wizardClauseError, setWizardClauseError] = useState("");
  const [wizardOfferType, setWizardOfferType] = useState("");
  const [wizardClauseText, setWizardClauseText] = useState("");
  const [wizardNotes, setWizardNotes] = useState("");
  const listRequestAbortRef = useRef(null);
  const wizardDraftSaveTimerRef = useRef(null);
  const wizardBootstrapHandledRef = useRef(false);
  const wizardWarehouseCacheRef = useRef(new Map());
  const wizardCustomerCacheRef = useRef(new Map());
  const deferredWizardWarehouseRows = useDeferredValue(wizardWarehouseRows);
  const deferredWizardCustomerRows = useDeferredValue(wizardCustomerRows);

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
      if (wizardCustomerCreateOpen) {
        setWizardCustomerCreateOpen(false);
        return;
      }
      if (wizardCustomerPickerOpen) {
        setWizardCustomerPickerOpen(false);
        return;
      }
      if (offerWizardOpen) {
        setOfferWizardOpen(false);
        return;
      }
      setDetailModalOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [detailModalOpen, offerWizardOpen, wizardCustomerPickerOpen, wizardCustomerCreateOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWizardWarehouseSearchDebounced(String(wizardWarehouseSearch || "").trim());
    }, WIZARD_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [wizardWarehouseSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWizardCustomerSearchDebounced(String(wizardCustomerSearch || "").trim());
    }, WIZARD_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [wizardCustomerSearch]);

  useEffect(() => {
    if (!offerWizardOpen) return;
    const controller = new AbortController();
    const normalizedSearch = String(wizardWarehouseSearchDebounced || "").trim();
    const cacheKey = normalizedSearch.toLowerCase();
    const cached = wizardWarehouseCacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < WIZARD_CACHE_TTL_MS) {
      setWizardWarehouseRows(cached.rows);
    }

    const run = async () => {
      setWizardWarehouseLoading(true);
      setWizardWarehouseError("");
      try {
        const params = new URLSearchParams({ limit: String(WIZARD_WAREHOUSE_LIMIT) });
        if (normalizedSearch) params.set("search", normalizedSearch);
        const res = await fetch(`${API_BASE}/api/warehouse/articoli?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Errore caricamento codici di magazzino.");
        const payload = await res.json();
        const nextRows = Array.isArray(payload?.data) ? payload.data : [];
        wizardWarehouseCacheRef.current.set(cacheKey, { rows: nextRows, ts: Date.now() });
        setWizardWarehouseRows(nextRows);
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (!cached) setWizardWarehouseRows([]);
        setWizardWarehouseError(err?.message || "Errore caricamento codici di magazzino.");
      } finally {
        setWizardWarehouseLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [offerWizardOpen, wizardWarehouseSearchDebounced]);

  useEffect(() => {
    if (!offerWizardOpen || !wizardCustomerPickerOpen) return;
    const controller = new AbortController();
    const normalizedSearch = String(wizardCustomerSearchDebounced || "").trim();
    const cacheKey = normalizedSearch.toLowerCase();
    const cached = wizardCustomerCacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < WIZARD_CACHE_TTL_MS) {
      setWizardCustomerRows(cached.rows);
    }

    const run = async () => {
      setWizardCustomerLoading(true);
      setWizardCustomerError("");
      try {
        const params = new URLSearchParams({ tipo: "clienti", limit: String(WIZARD_CUSTOMER_LIMIT) });
        if (normalizedSearch) params.set("search", normalizedSearch);
        const res = await fetch(`${API_BASE}/api/warehouse/fornitori?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Errore caricamento clienti.");
        const payload = await res.json();
        const nextRows = Array.isArray(payload?.data) ? payload.data : [];
        wizardCustomerCacheRef.current.set(cacheKey, { rows: nextRows, ts: Date.now() });
        setWizardCustomerRows(nextRows);
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (!cached) setWizardCustomerRows([]);
        setWizardCustomerError(err?.message || "Errore caricamento clienti.");
      } finally {
        setWizardCustomerLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [offerWizardOpen, wizardCustomerPickerOpen, wizardCustomerSearchDebounced]);

  useEffect(() => {
    if (!offerWizardOpen) return;
    const controller = new AbortController();
    const loadClauseTemplates = async () => {
      setWizardClauseLoading(true);
      setWizardClauseError("");
      try {
        const res = await fetch(`${API_BASE}/api/offerte/clausole`, { signal: controller.signal });
        if (!res.ok) throw new Error("Errore caricamento clausole.");
        const payload = await res.json();
        const rows = Array.isArray(payload?.data)
          ? payload.data
              .map((item) => ({
                cod: String(item?.cod || "").trim(),
                tipoOfferta: String(item?.tipoOfferta || "").trim(),
                condizioni: String(item?.condizioni || "").trim()
              }))
              .filter((item) => item.cod && item.tipoOfferta && item.condizioni)
          : [];
        setWizardClauseRows(rows);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setWizardClauseRows([]);
        setWizardClauseError(err?.message || "Errore caricamento clausole.");
      } finally {
        setWizardClauseLoading(false);
      }
    };

    loadClauseTemplates();
    return () => controller.abort();
  }, [offerWizardOpen]);

  useEffect(() => {
    if (!offerWizardOpen) return;
    const cacheKey = "";
    const cached = wizardCustomerCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.ts < WIZARD_CACHE_TTL_MS) return;
    const controller = new AbortController();
    const warmup = async () => {
      try {
        const params = new URLSearchParams({ tipo: "clienti", limit: String(WIZARD_CUSTOMER_LIMIT) });
        const res = await fetch(`${API_BASE}/api/warehouse/fornitori?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const payload = await res.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        wizardCustomerCacheRef.current.set(cacheKey, { rows, ts: Date.now() });
      } catch {
        // warmup is best-effort
      }
    };
    warmup();
    return () => controller.abort();
  }, [offerWizardOpen]);

  useEffect(() => {
    if (!offerWizardOpen || wizardClauseRows.length === 0) return;
    const selectedKey = String(wizardOfferType || "").trim();
    const match =
      wizardClauseRows.find((item) => item.cod === selectedKey) ||
      wizardClauseRows.find((item) => item.tipoOfferta.toUpperCase() === selectedKey.toUpperCase()) ||
      null;
    if (!match) {
      setWizardOfferType(String(wizardClauseRows[0].cod));
      if (!String(wizardClauseText || "").trim()) {
        setWizardClauseText(String(wizardClauseRows[0].condizioni || ""));
      }
      return;
    }
    if (match.cod !== selectedKey) {
      setWizardOfferType(String(match.cod));
    }
    if (!String(wizardClauseText || "").trim()) {
      setWizardClauseText(String(match.condizioni || ""));
    }
  }, [offerWizardOpen, wizardClauseRows, wizardOfferType, wizardClauseText]);

  useEffect(() => {
    if (!offerWizardOpen) return undefined;
    if (wizardDraftSaveTimerRef.current) {
      clearTimeout(wizardDraftSaveTimerRef.current);
    }
    wizardDraftSaveTimerRef.current = setTimeout(() => {
      try {
        const payload = {
          wizardStep,
          wizardManualCustomer,
          wizardWarehouseSearch,
          // Avoid persisting transient row selection to reduce synchronous localStorage churn.
          wizardCartRows: Array.isArray(wizardCartRows)
            ? wizardCartRows.map((row) => ({
                codiceArticolo: String(row?.codiceArticolo || "").trim(),
                descrizione: String(row?.descrizione || "").trim(),
                centroDiCosto: String(row?.centroDiCosto || "").trim(),
                quantita: Math.max(1, Number.parseInt(String(row?.quantita || "1"), 10) || 1)
              }))
            : [],
          wizardPaymentType,
          wizardPaymentTerms,
          wizardOfferType,
          wizardClauseText,
          wizardNotes,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore localStorage persistence errors
      }
    }, WIZARD_DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (wizardDraftSaveTimerRef.current) {
        clearTimeout(wizardDraftSaveTimerRef.current);
      }
    };
  }, [
    offerWizardOpen,
    wizardStep,
    wizardManualCustomer,
    wizardWarehouseSearch,
    wizardCartRows,
    wizardPaymentType,
    wizardPaymentTerms,
    wizardOfferType,
    wizardClauseText,
    wizardNotes
  ]);

  const openDetailModal = (cod) => {
    if (!cod) return;
    setSelectedCod(cod);
    setConditionsTab("fornitura");
    setDetailModalOpen(true);
  };

  const resetWizardState = () => {
    setWizardStep(0);
    setWizardManualCustomer(EMPTY_MANUAL_CUSTOMER);
    setWizardCustomerPickerOpen(false);
    setWizardCustomerSearch("");
    setWizardCustomerSearchDebounced("");
    setWizardCustomerRows([]);
    setWizardCustomerError("");
    setWizardCustomerSelectedCod(null);
    setWizardCustomerCreateOpen(false);
    setWizardCustomerCreateError("");
    setWizardNewCustomerForm(EMPTY_NEW_CUSTOMER_FORM);
    setWizardWarehouseSearch("");
    setWizardWarehouseSearchDebounced("");
    setWizardWarehouseRows([]);
    setWizardWarehouseError("");
    setWizardWarehouseSelectedCode("");
    setWizardCartRows([]);
    setWizardPaymentType("");
    setWizardPaymentTerms("");
    setWizardClauseRows([]);
    setWizardClauseError("");
    setWizardOfferType("");
    setWizardClauseText("");
    setWizardNotes("");
  };

  const loadWizardDraft = () => {
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return false;

      setWizardStep(Math.min(Math.max(Number(draft.wizardStep) || 0, 0), WIZARD_STEPS.length - 1));
      setWizardManualCustomer({
        ...EMPTY_MANUAL_CUSTOMER,
        ...(draft.wizardManualCustomer || {})
      });
      setWizardWarehouseSearch(String(draft.wizardWarehouseSearch || ""));
      setWizardWarehouseSearchDebounced(String(draft.wizardWarehouseSearch || "").trim());
      setWizardWarehouseSelectedCode(String(draft.wizardWarehouseSelectedCode || ""));
      setWizardCartRows(
        Array.isArray(draft.wizardCartRows)
          ? draft.wizardCartRows
              .map((row) => ({
                codiceArticolo: String(row?.codiceArticolo || "").trim(),
                descrizione: String(row?.descrizione || "").trim(),
                centroDiCosto: String(row?.centroDiCosto || "").trim(),
                quantita: Math.max(1, Number.parseInt(String(row?.quantita || "1"), 10) || 1)
              }))
              .filter((row) => row.codiceArticolo)
          : []
      );
      setWizardPaymentType(String(draft.wizardPaymentType || ""));
      setWizardPaymentTerms(String(draft.wizardPaymentTerms || ""));
      setWizardOfferType(String(draft.wizardOfferType || ""));
      setWizardClauseText(String(draft.wizardClauseText || ""));
      setWizardNotes(String(draft.wizardNotes || ""));
      return true;
    } catch {
      return false;
    }
  };

  const openOfferWizard = () => {
    const restored = loadWizardDraft();
    if (!restored) {
      resetWizardState();
    } else {
      setWizardCustomerPickerOpen(false);
      setWizardCustomerCreateOpen(false);
      setWizardCustomerCreateError("");
    }
    setOfferWizardOpen(true);
  };

  const clearWizardDraft = () => {
    try {
      localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    resetWizardState();
  };

  useEffect(() => {
    if (wizardBootstrapHandledRef.current) return;
    const params = new URLSearchParams(location.search || "");
    if (params.get("openWizard") !== "1") return;
    wizardBootstrapHandledRef.current = true;
    openOfferWizard();
    params.delete("openWizard");
    params.delete("from");
    params.delete("clienteCod");
    params.delete("tipo");
    params.delete("nominativo");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : ""
      },
      { replace: true, state: location.state }
    );
  }, [location.pathname, location.search, location.state, navigate]);

  const applyCustomerToWizard = useCallback((row) => {
    if (!row) return;
    setWizardManualCustomer((prev) => ({
      ...prev,
      nominativo: String(row.nominativo || "").trim(),
      piva: String(row.piva || "").trim(),
      indirizzo: String(row.indirizzo || "").trim(),
      citta: String(row.citta || "").trim(),
      cap: String(row.cap || "").trim(),
      provincia: String(row.provincia || "").trim(),
      email: String(row.email || "").trim(),
      telefono: String(row.telefoni || "").trim()
    }));
    setWizardCustomerPickerOpen(false);
  }, []);

  const createCustomerQuick = async () => {
    const nominativo = String(wizardNewCustomerForm.nominativo || "").trim();
    const piva = String(wizardNewCustomerForm.piva || "").trim();
    if (!nominativo || !piva) {
      setWizardCustomerCreateError("Nominativo e P.IVA sono obbligatori.");
      return;
    }

    setWizardCustomerCreateLoading(true);
    setWizardCustomerCreateError("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/fornitori`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "CLIENTE",
          nominativo,
          piva,
          indirizzo: wizardNewCustomerForm.indirizzo,
          citta: wizardNewCustomerForm.citta,
          cap: wizardNewCustomerForm.cap,
          provincia: wizardNewCustomerForm.provincia,
          telefoni: wizardNewCustomerForm.telefoni,
          email: wizardNewCustomerForm.email,
          pec: wizardNewCustomerForm.pec,
          note: wizardNewCustomerForm.note
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.errore || "Errore creazione cliente.");

      applyCustomerToWizard({
        nominativo,
        piva,
        indirizzo: wizardNewCustomerForm.indirizzo,
        citta: wizardNewCustomerForm.citta,
        cap: wizardNewCustomerForm.cap,
        provincia: wizardNewCustomerForm.provincia,
        telefoni: wizardNewCustomerForm.telefoni,
        email: wizardNewCustomerForm.email
      });
      setWizardCustomerCreateOpen(false);
      setWizardNewCustomerForm(EMPTY_NEW_CUSTOMER_FORM);
    } catch (err) {
      setWizardCustomerCreateError(err?.message || "Errore creazione cliente.");
    } finally {
      setWizardCustomerCreateLoading(false);
    }
  };

  const handleWarehouseRowSelect = useCallback((code) => {
    setWizardWarehouseSelectedCode(String(code || ""));
  }, []);

  const addWarehouseToCart = useCallback((item) => {
    const code = String(item?.codiceArticolo || "").trim();
    if (!code) return;
    setWizardCartRows((prev) => {
      const existingIndex = prev.findIndex((row) => String(row.codiceArticolo || "") === code);
      if (existingIndex >= 0) {
        const next = [...prev];
        const currentQty = Number(next[existingIndex].quantita || 0);
        next[existingIndex] = {
          ...next[existingIndex],
          quantita: Math.max(1, currentQty + 1)
        };
        return next;
      }
      return [
        ...prev,
        {
          codiceArticolo: code,
          descrizione: String(item?.descrizione || "").trim(),
          centroDiCosto: String(item?.centroDiCosto || "").trim(),
          quantita: 1
        }
      ];
    });
  }, []);

  const updateCartQty = useCallback((code, value) => {
    const qty = Math.max(1, Number.parseInt(String(value || "1"), 10) || 1);
    setWizardCartRows((prev) =>
      prev.map((row) =>
        String(row.codiceArticolo || "") === String(code || "")
          ? {
              ...row,
              quantita: qty
            }
          : row
      )
    );
  }, []);

  const removeCartRow = useCallback((code) => {
    setWizardCartRows((prev) => prev.filter((row) => String(row.codiceArticolo || "") !== String(code || "")));
  }, []);

  const wizardWarehouseBodyRows = useMemo(() => {
    if (!wizardWarehouseLoading && deferredWizardWarehouseRows.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
            Nessun codice trovato.
          </td>
        </tr>
      );
    }

    return deferredWizardWarehouseRows.map((item) => {
      const code = String(item.codiceArticolo || "");
      const isSelected = code === String(wizardWarehouseSelectedCode || "");
      return (
        <tr
          key={code}
          className={`border-t border-[var(--border)] ${isSelected ? "bg-emerald-500/10" : ""}`}
          onClick={() => handleWarehouseRowSelect(code)}
        >
          <td className="px-2 py-1.5 font-semibold text-sky-400">
            <span className="block truncate" title={item.codiceArticolo || "-"}>
              {item.codiceArticolo || "-"}
            </span>
          </td>
          <td className="px-2 py-1.5">
            <span className="block truncate" title={item.descrizione || "-"}>
              {item.descrizione || "-"}
            </span>
          </td>
          <td className="px-2 py-1.5">
            <span className="block truncate" title={item.centroDiCosto || "-"}>
              {item.centroDiCosto || "-"}
            </span>
          </td>
          <td className="px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                addWarehouseToCart(item);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--muted)] hover:bg-[var(--hover)]"
              aria-label={`Aggiungi ${item.codiceArticolo || "articolo"} al carrello`}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          </td>
        </tr>
      );
    });
  }, [
    addWarehouseToCart,
    deferredWizardWarehouseRows,
    handleWarehouseRowSelect,
    wizardWarehouseLoading,
    wizardWarehouseSelectedCode
  ]);

  const wizardCartBodyRows = useMemo(() => {
    if (wizardCartRows.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">
            Nessuna voce nel carrello.
          </td>
        </tr>
      );
    }

    return wizardCartRows.map((row, index) => (
      <tr
        key={`cart-${row.codiceArticolo}`}
        className={`border-t border-[var(--border)] ${index === wizardCartRows.length - 1 ? "border-b border-[var(--border)]" : ""}`}
      >
        <td className="px-1.5 py-1 font-semibold text-sky-400">{row.codiceArticolo || "-"}</td>
        <td className="px-1.5 py-1">
          <span className="block truncate" title={row.descrizione || "-"}>
            {row.descrizione || "-"}
          </span>
        </td>
        <td className="px-1.5 py-1">{row.centroDiCosto || "-"}</td>
        <td className="px-1.5 py-1">
          <input
            type="number"
            min="1"
            value={row.quantita}
            onChange={(event) => updateCartQty(row.codiceArticolo, event.target.value)}
            className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs text-[var(--page-fg)] shadow-sm outline-none"
          />
        </td>
        <td className="px-1.5 py-1 text-center">
          <button
            type="button"
            onClick={() => removeCartRow(row.codiceArticolo)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-rose-500/15 hover:text-rose-400"
            aria-label={`Rimuovi ${row.codiceArticolo || "articolo"} dal carrello`}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </td>
      </tr>
    ));
  }, [removeCartRow, updateCartQty, wizardCartRows]);

  const wizardCustomerBodyRows = useMemo(() => {
    if (!wizardCustomerLoading && deferredWizardCustomerRows.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-3 py-8 text-center text-[var(--muted)]">
            Nessun cliente trovato.
          </td>
        </tr>
      );
    }

    return deferredWizardCustomerRows.map((row) => (
      <tr
        key={`wizard-customer-${row.cod}`}
        onClick={() => {
          setWizardCustomerSelectedCod(Number(row.cod));
          applyCustomerToWizard(row);
        }}
        className={`cursor-pointer border-t border-[var(--border)] ${
          Number(row.cod) === Number(wizardCustomerSelectedCod) ? "bg-emerald-500/10" : ""
        }`}
      >
        <td className="px-3 py-2 font-semibold text-sky-400 whitespace-nowrap">
          <span className="block truncate" title={row.nominativo || "-"}>
            {row.nominativo || "-"}
          </span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="block truncate" title={row.piva || "-"}>
            {row.piva || "-"}
          </span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="block truncate" title={row.indirizzo || "-"}>
            {row.indirizzo || "-"}
          </span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="block truncate" title={row.citta || "-"}>
            {row.citta || "-"}
          </span>
        </td>
      </tr>
    ));
  }, [applyCustomerToWizard, deferredWizardCustomerRows, wizardCustomerLoading, wizardCustomerSelectedCod]);

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

  const selectedOfferType = useMemo(() => {
    const key = String(wizardOfferType || "").trim();
    if (!key) return null;
    return (
      wizardClauseRows.find((item) => String(item.cod || "") === key) ||
      wizardClauseRows.find((item) => String(item.tipoOfferta || "").toUpperCase() === key.toUpperCase()) ||
      null
    );
  }, [wizardClauseRows, wizardOfferType]);

  const wizardPreviewCustomer = useMemo(() => wizardManualCustomer, [wizardManualCustomer]);

  const wizardValidation = useMemo(() => {
    const errors = { anagrafica: "", magazzino: "", pagamento: "", clausole: "" };
    if (!String(wizardManualCustomer.nominativo || "").trim()) {
      errors.anagrafica = "Inserisci almeno il nominativo cliente.";
    }
    if (wizardCartRows.length === 0) errors.magazzino = "Aggiungi almeno un codice di magazzino al carrello.";
    if (!String(wizardPaymentTerms || "").trim()) errors.pagamento = "Inserisci le condizioni di pagamento.";
    if (!String(wizardClauseText || "").trim()) errors.clausole = "Inserisci o seleziona le clausole.";
    return errors;
  }, [
    wizardManualCustomer.nominativo,
    wizardClauseText,
    wizardPaymentTerms,
    wizardCartRows.length
  ]);

  const canGoStep = (idx) => {
    if (idx === 0) return !wizardValidation.anagrafica;
    if (idx === 1) return !wizardValidation.magazzino;
    if (idx === 2) return !wizardValidation.pagamento;
    if (idx === 3) return !wizardValidation.clausole;
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ui-control h-9 px-3 text-xs"
                  onClick={clearWizardDraft}
                >
                  Nuova bozza
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                  onClick={() => setOfferWizardOpen(false)}
                  aria-label="Chiudi wizard"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
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
                  <button
                    type="button"
                    onClick={clearWizardDraft}
                    className="ui-control h-8 shrink-0 px-2.5 text-xs whitespace-nowrap"
                  >
                    Ricomincia
                  </button>

                </div>

                <div className={`mt-3 min-h-0 flex-1 pr-1 ${wizardStepId === "magazzino" ? "overflow-hidden" : "overflow-y-auto"}`}>
                  {wizardStepId === "anagrafica" ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                          Nominativo
                          <div className="relative mt-1">
                            <input
                              type="text"
                              value={wizardManualCustomer.nominativo}
                              onChange={(event) => setWizardManualCustomer((prev) => ({ ...prev, nominativo: event.target.value }))}
                              className="ui-control w-full pr-11 px-3 text-sm normal-case tracking-normal"
                            />
                            <button
                              type="button"
                              onClick={() => setWizardCustomerPickerOpen(true)}
                              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                              aria-label="Cerca cliente da database"
                              title="Cerca cliente da database"
                            >
                              <i className="fa-solid fa-magnifying-glass text-[11px]" aria-hidden="true" />
                            </button>
                          </div>
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

                      {wizardValidation.anagrafica ? <p className="text-sm text-amber-500">{wizardValidation.anagrafica}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "magazzino" ? (
                    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
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

                      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,61.8fr)_minmax(0,38.2fr)] gap-3 overflow-hidden">
                        <div className="min-h-0 overflow-hidden rounded-md border border-[var(--border)]">
                          <div className="h-full min-h-0 overflow-auto">
                            <table className="table-dense w-full min-w-[760px] table-fixed text-xs whitespace-nowrap">
                              <thead className="sticky top-0 bg-[var(--surface-strong)]">
                                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                                  <th className="w-[24%] px-2 py-1.5">Codice</th>
                                  <th className="w-[52%] px-2 py-1.5">Descrizione</th>
                                  <th className="w-[18%] px-2 py-1.5">Centro</th>
                                  <th className="w-[6%] px-2 py-1.5 text-center">+</th>
                                </tr>
                              </thead>
                              <tbody>{wizardWarehouseBodyRows}</tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--border)]">
                          <div className="border-b border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                            Carrello fornitura
                          </div>
                          <div className="min-h-0 flex-1 overflow-auto">
                            <table className="table-dense w-full min-w-[760px] table-fixed text-xs whitespace-nowrap">
                              <thead className="sticky top-0 bg-[var(--surface)]">
                                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                                  <th className="w-[22%] px-1.5 py-1">Codice</th>
                                  <th className="w-[46%] px-1.5 py-1">Descrizione</th>
                                  <th className="w-[14%] px-1.5 py-1">Centro</th>
                                  <th className="w-[12%] px-1.5 py-1">Quantita</th>
                                  <th className="w-[6%] px-1.5 py-1 text-center" />
                                </tr>
                              </thead>
                              <tbody>{wizardCartBodyRows}</tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {wizardValidation.magazzino ? <p className="text-sm text-amber-500">{wizardValidation.magazzino}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "pagamento" ? (
                    <div className="flex h-full min-h-0 flex-col gap-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {PAYMENT_TYPES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setWizardPaymentType(item);
                              setWizardPaymentTerms(PAYMENT_TERMS_PRESET[item] || item);
                            }}
                            className={`ui-control px-3 text-left text-sm ${wizardPaymentType === item ? "border-emerald-500 bg-emerald-500/10" : ""}`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      <label className="block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Tipo pagamento
                        <input
                          type="text"
                          value={wizardPaymentType}
                          onChange={(event) => setWizardPaymentType(event.target.value)}
                          placeholder="Es. Bonifico bancario"
                          className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                        />
                      </label>
                      <label className="flex min-h-0 flex-1 flex-col text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Condizioni pagamento (fatture/contratti)
                        <textarea
                          value={wizardPaymentTerms}
                          onChange={(event) => setWizardPaymentTerms(event.target.value)}
                          placeholder="Es. 30% all'ordine, saldo a 60gg data fattura. Fatturazione mensile posticipata."
                          className="mt-1 min-h-0 flex-1 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--page-fg)] outline-none"
                        />
                      </label>
                      {wizardValidation.pagamento ? <p className="text-sm text-amber-500">{wizardValidation.pagamento}</p> : null}
                    </div>
                  ) : null}

                  {wizardStepId === "clausole" ? (
                    <div className="flex h-full min-h-0 flex-col gap-3">
                      <div className="ui-select-wrap">
                        <select
                          value={String(wizardOfferType || "")}
                          disabled={wizardClauseLoading || wizardClauseRows.length === 0}
                          onChange={(event) => {
                            const selected = String(event.target.value || "");
                            setWizardOfferType(selected);
                            const match = wizardClauseRows.find((item) => String(item.cod) === selected);
                            if (match) {
                              setWizardClauseText(String(match.condizioni || ""));
                            }
                          }}
                          className="ui-control ui-select w-full px-3 text-sm"
                        >
                          {wizardClauseRows.length === 0 ? (
                            <option value="">Nessuna clausola disponibile</option>
                          ) : null}
                          {wizardClauseRows.map((item) => (
                            <option key={`clausola-${item.cod}`} value={String(item.cod)}>
                              {item.tipoOfferta}
                            </option>
                          ))}
                        </select>
                        <i className="ui-select-caret fa-solid fa-chevron-down" aria-hidden="true" />
                      </div>
                      <label className="flex min-h-0 flex-1 flex-col text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        Clausole contrattuali
                        <textarea
                          value={wizardClauseText}
                          onChange={(event) => setWizardClauseText(event.target.value)}
                          className="mt-1 min-h-0 flex-1 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--page-fg)] outline-none"
                        />
                      </label>
                      {wizardClauseLoading ? <p className="text-sm text-[var(--muted)]">Caricamento clausole...</p> : null}
                      {wizardClauseError ? <p className="text-sm text-rose-500">{wizardClauseError}</p> : null}
                      {wizardValidation.clausole ? <p className="text-sm text-amber-500">{wizardValidation.clausole}</p> : null}
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
                        <p className="mt-1 font-semibold">Righe carrello: {wizardCartRows.length}</p>
                        <div className="mt-1 space-y-1">
                          {wizardCartRows.slice(0, 4).map((row) => (
                            <p key={`summary-${row.codiceArticolo}`} className="text-xs text-[var(--muted)]">
                              {row.codiceArticolo || "-"} - {row.descrizione || "-"} (qt {row.quantita || 0})
                            </p>
                          ))}
                          {wizardCartRows.length === 0 ? <p className="text-xs text-[var(--muted)]">-</p> : null}
                        </div>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Condizioni</p>
                        <p>Pagamento: <span className="font-semibold">{wizardPaymentType || "-"}</span></p>
                        <p className="mt-1 text-[var(--muted)] whitespace-pre-wrap">
                          Condizioni pagamento: {wizardPaymentTerms || "-"}
                        </p>
                        <p>Clausola: <span className="font-semibold">{selectedOfferType?.tipoOfferta || "-"}</span></p>
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
                        <div className="border-l border-white/60 text-center">{selectedOfferType?.tipoOfferta?.toUpperCase() || "-"}</div>
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
                        Pagamento: {wizardPaymentType || "-"} | Clausola: {selectedOfferType?.tipoOfferta || "-"}
                      </div>
                      <div className="border-t border-[#9ca3af] px-2 py-1 text-[11px] font-semibold italic whitespace-pre-wrap">
                        Condizioni pagamento: {wizardPaymentTerms || "-"}
                      </div>
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-[#0b8fd1] text-left text-white">
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Codice:</th>
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Descrizione:</th>
                            <th className="border border-[#9ca3af] px-1 py-1 text-right font-bold italic">qt</th>
                            <th className="border border-[#9ca3af] px-1 py-1 font-bold italic">Clausola</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wizardCartRows.length > 0 ? (
                            wizardCartRows.map((row) => (
                              <tr key={`preview-cart-${row.codiceArticolo}`}>
                                <td className="border border-[#9ca3af] px-1 py-1">{row.codiceArticolo || "-"}</td>
                                <td className="border border-[#9ca3af] px-1 py-1">{row.descrizione || "-"}</td>
                                <td className="border border-[#9ca3af] px-1 py-1 text-right">{row.quantita || 0}</td>
                                <td className="border border-[#9ca3af] px-1 py-1">{selectedOfferType?.tipoOfferta || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="border border-[#9ca3af] px-1 py-2 text-center text-[#6b7280]">
                                -
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="min-h-[120px]" />
                    <div className="border border-[#9ca3af] border-t-0">
                      <div className="bg-[#0b8fd1] px-2 py-1 text-[11px] font-bold italic text-white">CLAUSOLE</div>
                      <div className="min-h-[72px] px-2 py-1 text-[11px] font-semibold italic whitespace-pre-wrap">
                        {wizardClauseText || "-"}
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

      {offerWizardOpen && wizardCustomerPickerOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-3"
          onMouseDown={() => setWizardCustomerPickerOpen(false)}
        >
          <div
            className="flex h-[78dvh] max-h-[78dvh] w-full max-w-[1100px] min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Database clienti</p>
                <h3 className="text-sm font-semibold">Seleziona cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setWizardCustomerPickerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                aria-label="Chiudi clienti"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-3">
              <div className="flex items-center gap-2">
                <div className="ui-control flex min-w-0 flex-1 items-center px-2">
                  <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                  <input
                    type="text"
                    value={wizardCustomerSearch}
                    onChange={(event) => setWizardCustomerSearch(event.target.value)}
                    placeholder="Cerca nominativo o P.IVA"
                    className="ml-3 h-full w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWizardCustomerCreateError("");
                    setWizardCustomerCreateOpen(true);
                  }}
                  className="ui-control inline-flex h-10 w-10 items-center justify-center"
                  aria-label="Nuovo cliente"
                  title="Registra cliente al volo"
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>

              {wizardCustomerError ? <p className="mt-2 text-sm text-rose-500">{wizardCustomerError}</p> : null}

              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
                <table className="table-dense w-full min-w-[920px] table-fixed text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-[var(--surface-strong)]">
                    <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                      <th className="w-[38%] px-3 py-2 whitespace-nowrap">Nominativo</th>
                      <th className="w-[18%] px-3 py-2 whitespace-nowrap">P.IVA</th>
                      <th className="w-[30%] px-3 py-2 whitespace-nowrap">Indirizzo</th>
                      <th className="w-[14%] px-3 py-2 whitespace-nowrap">Citta</th>
                    </tr>
                  </thead>
                  <tbody>{wizardCustomerBodyRows}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {offerWizardOpen && wizardCustomerPickerOpen && wizardCustomerCreateOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-3"
          onMouseDown={() => setWizardCustomerCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Nuovo cliente</h4>
              <button
                type="button"
                onClick={() => setWizardCustomerCreateOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                aria-label="Chiudi nuovo cliente"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                Nominativo *
                <input
                  type="text"
                  value={wizardNewCustomerForm.nominativo}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, nominativo: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                P.IVA *
                <input
                  type="text"
                  value={wizardNewCustomerForm.piva}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, piva: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] md:col-span-2">
                Indirizzo
                <input
                  type="text"
                  value={wizardNewCustomerForm.indirizzo}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, indirizzo: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                Citta
                <input
                  type="text"
                  value={wizardNewCustomerForm.citta}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, citta: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                CAP
                <input
                  type="text"
                  value={wizardNewCustomerForm.cap}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, cap: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                Provincia
                <input
                  type="text"
                  value={wizardNewCustomerForm.provincia}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, provincia: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                Telefono
                <input
                  type="text"
                  value={wizardNewCustomerForm.telefoni}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, telefoni: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                Email
                <input
                  type="text"
                  value={wizardNewCustomerForm.email}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                PEC
                <input
                  type="text"
                  value={wizardNewCustomerForm.pec}
                  onChange={(event) => setWizardNewCustomerForm((prev) => ({ ...prev, pec: event.target.value }))}
                  className="ui-control mt-1 w-full px-3 text-sm normal-case tracking-normal"
                />
              </label>
            </div>
            {wizardCustomerCreateError ? <p className="mt-3 text-sm text-rose-500">{wizardCustomerCreateError}</p> : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWizardCustomerCreateOpen(false)}
                className="ui-control px-3 text-sm"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={createCustomerQuick}
                disabled={wizardCustomerCreateLoading}
                className="ui-control border-emerald-500 bg-emerald-500/15 px-3 text-sm text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {wizardCustomerCreateLoading ? "Creazione..." : "Registra cliente"}
              </button>
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
