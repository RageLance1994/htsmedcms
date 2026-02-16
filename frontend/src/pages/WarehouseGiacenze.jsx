import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("it-IT");
};

const getLocalDateTimeValue = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const MEASUREMENT_UNITS = ["QT", "KG", "METRI", "LITRI"];

const normalizeUnit = (value) => {
  const next = String(value || "").trim().toUpperCase();
  return MEASUREMENT_UNITS.includes(next) ? next : "QT";
};

const DDT_FILE_TYPES = ["ddt", "fattura del vettore", "fattura d'aquisto", "immagine prodotto"];

export default function WarehouseGiacenze() {
  const initialDprRef = useRef(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const toolbarRef = useRef(null);
  const movimentiBtnRef = useRef(null);
  const strumentiBtnRef = useRef(null);
  const supplierComboRef = useRef(null);
  const supplierDefaultedRef = useRef(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 0 });
  const [rowMenu, setRowMenu] = useState({ open: false, x: 0, y: 0, item: null });
  const [sortKey, setSortKey] = useState("codiceArticolo");
  const [sortDir, setSortDir] = useState(null);
  const [caricoScaricoMode, setCaricoScaricoMode] = useState("");
  const [causaliOpen, setCausaliOpen] = useState(false);
  const [causaliType, setCausaliType] = useState("carico");
  const [causali, setCausali] = useState([]);
  const [causaliLoading, setCausaliLoading] = useState(false);
  const [causaliError, setCausaliError] = useState("");
  const [causaliSoloNonNascoste, setCausaliSoloNonNascoste] = useState(true);
  const [selectedCausale, setSelectedCausale] = useState(null);
  const [caricoWizardOpen, setCaricoWizardOpen] = useState(false);
  const [caricoDate, setCaricoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [caricoDateTimeLocal, setCaricoDateTimeLocal] = useState(() => getLocalDateTimeValue());
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierComboOpen, setSupplierComboOpen] = useState(false);
  const [articleSearch, setArticleSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [entryQty, setEntryQty] = useState(1);
  const [entryUnit, setEntryUnit] = useState("QT");
  const [movementItems, setMovementItems] = useState([]);
  const [selectedMovementItemId, setSelectedMovementItemId] = useState(null);
  const [ddtCode, setDdtCode] = useState("");
  const [ddtPdfFile, setDdtPdfFile] = useState(null);
  const [ddtUploadedFiles, setDdtUploadedFiles] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [oemPartNumber, setOemPartNumber] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [desktopExtraCardsCollapsed, setDesktopExtraCardsCollapsed] = useState(false);
  const [compactCaricoLayout, setCompactCaricoLayout] = useState(false);
  const [ddtImporting, setDdtImporting] = useState(false);
  const [labelScanning, setLabelScanning] = useState(false);
  const [aiAssistError, setAiAssistError] = useState("");
  const [aiAssistInfo, setAiAssistInfo] = useState("");
  const [caricoSaving, setCaricoSaving] = useState(false);
  const [caricoError, setCaricoError] = useState("");
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [serialsByCode, setSerialsByCode] = useState({});
  const [serialsLoading, setSerialsLoading] = useState({});
  const ddtPdfInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [limit, setLimit] = useState(50);
  const filteredItems = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return items.filter((item) => {
      const code = String(item.codiceArticolo || "").toLowerCase();
      const desc = String(item.descrizione || "").toLowerCase();
      const min = Number(item.giacenzaMinima || 0);
      const qty = Number(item.giacenzaFisica || 0);
      const isAlert = qty < min;
      const matchesSearch = !term || code.includes(term) || desc.includes(term);
      return matchesSearch && (!alertsOnly || isAlert);
    });
  }, [items, debouncedSearch, alertsOnly]);

  const sortedItems = useMemo(() => {
    if (!sortDir) return filteredItems;
    const copy = [...filteredItems];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const aVal =
        sortKey === "alert"
          ? Number((a?.giacenzaFisica || 0) < (a?.giacenzaMinima || 0))
          : a?.[sortKey];
      const bVal =
        sortKey === "alert"
          ? Number((b?.giacenzaFisica || 0) < (b?.giacenzaMinima || 0))
          : b?.[sortKey];
      if (aVal === null || aVal === undefined) return 1 * dir;
      if (bVal === null || bVal === undefined) return -1 * dir;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal), "it", { numeric: true, sensitivity: "base" }) * dir;
    });
    return copy;
  }, [filteredItems, sortKey, sortDir]);

  const total = sortedItems.length;
  const effectiveLimit = limit === "all" ? Math.max(total, 1) : limit;
  const totalPages = useMemo(() => Math.max(Math.ceil(total / effectiveLimit), 1), [total, effectiveLimit]);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * effectiveLimit;
    return sortedItems.slice(start, start + effectiveLimit);
  }, [sortedItems, page, effectiveLimit]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "5000",
        search: ""
      });
      const res = await fetch(`${API_BASE}/api/warehouse/giacenze?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento dati");
      const payload = await res.json();
      setItems(payload.data || []);
    } catch (err) {
      setError(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  };

  const fetchSerials = async (codice) => {
    if (!codice || serialsByCode[codice] || serialsLoading[codice]) return;
    setSerialsLoading((prev) => ({ ...prev, [codice]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/giacenze/seriali?codice=${encodeURIComponent(codice)}`);
      if (!res.ok) throw new Error("Errore caricamento seriali");
      const payload = await res.json();
      setSerialsByCode((prev) => ({ ...prev, [codice]: payload.rows || [] }));
    } catch {
      setSerialsByCode((prev) => ({ ...prev, [codice]: [] }));
    } finally {
      setSerialsLoading((prev) => ({ ...prev, [codice]: false }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!caricoWizardOpen) return;
    const term = supplierSearch.trim();
    const timer = setTimeout(() => {
      fetchSuppliers(term);
    }, 350);
    return () => clearTimeout(timer);
  }, [supplierSearch, caricoWizardOpen]);

  useEffect(() => {
    if (!caricoWizardOpen) return;
    const term = articleSearch.trim();
    if (!term) return;
    const timer = setTimeout(() => {
      fetchArticles(term);
    }, 350);
    return () => clearTimeout(timer);
  }, [articleSearch, caricoWizardOpen]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, alertsOnly, limit, sortKey, sortDir]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!caricoWizardOpen) {
      setSuppliers([]);
      setArticles([]);
      setSupplierSearch("");
      setArticleSearch("");
      return;
    }
    if (!suppliers.length && !supplierSearch.trim()) {
      fetchSuppliers("");
    }
    if (!articles.length && !articleSearch.trim()) {
      fetchArticles("");
    }
  }, [caricoWizardOpen, suppliers.length, articles.length]);

  useEffect(() => {
    if (selectedArticle?.unitaMisura) {
      setEntryUnit(normalizeUnit(selectedArticle.unitaMisura));
    } else {
      setEntryUnit("QT");
    }
  }, [selectedArticle]);

  useEffect(() => {
    if (!selectedMovementItemId) return;
    if (!movementItems.some((item) => item.id === selectedMovementItemId)) {
      setSelectedMovementItemId(null);
    }
  }, [movementItems, selectedMovementItemId]);

  useEffect(() => {
    if (!caricoWizardOpen || !supplierComboOpen) return;
    const handleOutsideClick = (event) => {
      if (!supplierComboRef.current?.contains(event.target)) {
        setSupplierComboOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSupplierComboOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [caricoWizardOpen, supplierComboOpen]);

  useEffect(() => {
    if (!caricoWizardOpen) return;
    setCaricoDateTimeLocal(getLocalDateTimeValue());
  }, [caricoWizardOpen]);

  useEffect(() => {
    if (caricoWizardOpen) {
      supplierDefaultedRef.current = false;
    }
  }, [caricoWizardOpen]);

  useEffect(() => {
    const updateCompactLayout = () => {
      const vv = window.visualViewport;
      const scale = Number(vv?.scale || 1);
      const innerW = Number(window.innerWidth || 0);
      const outerW = Number(window.outerWidth || 0);
      const browserZoom = innerW > 0 && outerW > 0 ? outerW / innerW : 1;
      const currentDpr = Number(window.devicePixelRatio || 1);
      if (initialDprRef.current === null) {
        initialDprRef.current = currentDpr;
      }
      const dprZoom = currentDpr / Number(initialDprRef.current || 1);
      const height = Number(vv?.height || window.innerHeight || 0);
      const width = Number(vv?.width || window.innerWidth || 0);
      const zoomFactor = Math.max(scale, browserZoom, dprZoom);
      const compact = zoomFactor >= 1.12 || height < 820 || (width > 1024 && height < 940);
      setCompactCaricoLayout(compact);
    };

    updateCompactLayout();
    window.addEventListener("resize", updateCompactLayout);
    window.visualViewport?.addEventListener("resize", updateCompactLayout);
    return () => {
      window.removeEventListener("resize", updateCompactLayout);
      window.visualViewport?.removeEventListener("resize", updateCompactLayout);
    };
  }, []);

  useEffect(() => {
    if (!caricoWizardOpen) return;
    if (compactCaricoLayout) {
      setDesktopExtraCardsCollapsed(true);
    }
  }, [caricoWizardOpen, compactCaricoLayout]);

  useEffect(() => {
    if (!caricoWizardOpen || suppliers.length === 0) return;
    if (supplierDefaultedRef.current) return;
    setSelectedSupplier(suppliers[0]);
    setSupplierSearch(suppliers[0]?.nominativo || "");
    supplierDefaultedRef.current = true;
  }, [caricoWizardOpen, suppliers]);

  const toggleMenu = (name) => {
    const targetRef = name === "movimenti" ? movimentiBtnRef : strumentiBtnRef;
    const btn = targetRef.current;
    if (!btn) return;
    if (openMenu === name) {
      setOpenMenu("");
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width
    });
    setOpenMenu(name);
  };

  useEffect(() => {
    const closeMenu = () => setOpenMenu("");
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const toggleSort = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const handleSortClick = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => {
        if (dir === "asc") return "desc";
        if (dir === "desc") return null;
        return "asc";
      });
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const fetchCausali = async (type, soloNonNascoste) => {
    setCausaliLoading(true);
    setCausaliError("");
    try {
      const params = new URLSearchParams({
        tipo: type,
        soloNonNascoste: soloNonNascoste ? "1" : "0"
      });
      const res = await fetch(`${API_BASE}/api/warehouse/causali?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento causali");
      const payload = await res.json();
      setCausali(payload.data || []);
    } catch (err) {
      setCausaliError(err.message || "Errore imprevisto");
      setCausali([]);
    } finally {
      setCausaliLoading(false);
    }
  };

  const openCausaliPicker = (type) => {
    setCausaliType(type);
    setSelectedCausale(null);
    setCausaliOpen(true);
    fetchCausali(type, causaliSoloNonNascoste);
  };

  const addMovementItem = () => {
    if (!selectedArticle) return;
    const qty = Math.max(parseInt(entryQty, 10) || 1, 1);
    const unit = normalizeUnit(entryUnit || selectedArticle?.unitaMisura || "QT");
    const nextId = `${selectedArticle.codiceArticolo}-${Date.now()}`;
    setMovementItems((prev) => [
      ...prev,
      {
        id: nextId,
        articolo: selectedArticle,
        quantita: qty,
        unitaMisura: unit,
        seriali: [],
        note: ""
      }
    ]);
    setSelectedMovementItemId(nextId);
  };

  const addMovementItemFromArticle = (article) => {
    if (!article) return;
    setSelectedArticle(article);
    const qty = 1;
    const unit = normalizeUnit(article?.unitaMisura || entryUnit || "QT");
    const nextId = `${article.codiceArticolo}-${Date.now()}`;
    setMovementItems((prev) => [
      ...prev,
      {
        id: nextId,
        articolo: article,
        quantita: qty,
        unitaMisura: unit,
        seriali: [],
        note: ""
      }
    ]);
    setSelectedMovementItemId(nextId);
  };

  const removeMovementItemById = (id) => {
    setMovementItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedMovementItemId((prev) => (prev === id ? null : prev));
  };

  const removeSelectedMovementItem = () => {
    if (!selectedMovementItemId) return;
    removeMovementItemById(selectedMovementItemId);
  };

  const handleDdtFileSelection = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) return;
    const rows = incomingFiles.map((file, idx) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${idx}`,
      file,
      docType: "ddt"
    }));
    setDdtUploadedFiles((prev) => [...prev, ...rows]);
    setDdtPdfFile(incomingFiles[incomingFiles.length - 1]);
    event.target.value = "";
  };

  const handleDdtFileTypeChange = (id, nextType) => {
    setDdtUploadedFiles((prev) =>
      prev.map((row) => (row.id === id ? { ...row, docType: String(nextType || "").toLowerCase() } : row))
    );
  };

  const importDataFromDdt = async () => {
    const selectedDdtFile = ddtUploadedFiles.find((row) => row.docType === "ddt")?.file || ddtPdfFile;
    if (!selectedDdtFile) {
      setAiAssistError("Carica almeno un file e impostalo come DDT.");
      setAiAssistInfo("");
      return;
    }
    setDdtImporting(true);
    setAiAssistError("");
    setAiAssistInfo("");
    try {
      const formData = new FormData();
      formData.append("ddtPdf", selectedDdtFile);
      formData.append("ddtCode", ddtCode || "");
      if (selectedSupplier?.cod) {
        formData.append("supplierCode", String(selectedSupplier.cod));
      }
      const res = await fetch(`${API_BASE}/api/warehouse/ddt/import`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.errore || "Importazione DDT non riuscita");
      }
      const payload = await res.json();
      if (payload?.ddtCode) {
        setDdtCode(String(payload.ddtCode));
      }
      const importedItems = Array.isArray(payload?.items) ? payload.items : [];
      if (importedItems.length > 0) {
        const mapped = importedItems.map((row, index) => {
          const code = String(row?.codiceArticolo || row?.codice || "").trim();
          const qty = Math.max(parseInt(row?.quantita, 10) || 1, 1);
          const detectedUnit = normalizeUnit(row?.unitaMisura || row?.um || "QT");
          const linkedArticle = articles.find((item) => String(item.codiceArticolo || "").trim() === code);
          return {
            id: `${code || "ART"}-IMP-${Date.now()}-${index}`,
            articolo:
              linkedArticle ||
              {
                codiceArticolo: code || "N/D",
                descrizione: String(row?.descrizione || row?.descrizioneArticolo || "Articolo da DDT"),
                unitaMisura: detectedUnit
              },
            quantita: qty,
            unitaMisura: detectedUnit,
            seriali: [],
            note: String(row?.note || "")
          };
        });
        setMovementItems((prev) => [...prev, ...mapped]);
        setSelectedMovementItemId(mapped[mapped.length - 1].id);
      }
      setAiAssistInfo(`Import DDT completato: ${importedItems.length} righe riconosciute.`);
    } catch (err) {
      setAiAssistError(err.message || "Errore import DDT");
    } finally {
      setDdtImporting(false);
    }
  };

  const scanLabelWithAi = async () => {
    if (!photoFile) {
      setAiAssistError("Carica una foto etichetta prima della scansione.");
      setAiAssistInfo("");
      return;
    }
    setLabelScanning(true);
    setAiAssistError("");
    setAiAssistInfo("");
    try {
      const formData = new FormData();
      formData.append("labelImage", photoFile);
      const res = await fetch(`${API_BASE}/api/warehouse/ai/scan-label`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.errore || "Scansione etichetta non riuscita");
      }
      const payload = await res.json();
      const detectedCode = String(payload?.article?.codiceArticolo || payload?.articleCode || "").trim();
      const detectedDescription = String(payload?.article?.descrizione || payload?.description || "").trim();
      const detectedUnit = normalizeUnit(payload?.article?.unitaMisura || payload?.unit || entryUnit);
      const foundArticle = articles.find((row) => {
        const code = String(row.codiceArticolo || "").trim();
        const desc = String(row.descrizione || "").trim().toLowerCase();
        return (detectedCode && code === detectedCode) || (detectedDescription && desc === detectedDescription.toLowerCase());
      });
      if (foundArticle) {
        setSelectedArticle(foundArticle);
        setEntryUnit(normalizeUnit(foundArticle.unitaMisura || detectedUnit));
      } else if (detectedCode || detectedDescription) {
        setSelectedArticle({
          codiceArticolo: detectedCode || "N/D",
          descrizione: detectedDescription || "Articolo rilevato da AI",
          unitaMisura: detectedUnit
        });
        setEntryUnit(detectedUnit);
      }
      if (detectedCode || detectedDescription) {
        setArticleSearch(detectedCode || detectedDescription);
      }
      const confidence = payload?.confidence ? ` (confidenza ${Math.round(Number(payload.confidence) * 100)}%)` : "";
      setAiAssistInfo(`Etichetta riconosciuta${confidence}.`);
    } catch (err) {
      setAiAssistError(err.message || "Errore scansione AI");
    } finally {
      setLabelScanning(false);
    }
  };

  const submitCarico = async () => {
    if (!selectedCausale || !selectedSupplier || movementItems.length === 0) return;
    setCaricoSaving(true);
    setCaricoError("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/carico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          causale: selectedCausale,
          dataMovimento: caricoDate,
          fornitore: selectedSupplier,
          items: movementItems
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.errore || "Errore salvataggio carico");
      }
      setCaricoWizardOpen(false);
      fetchData({ page, limit, search: debouncedSearch, alerts: alertsOnly });
    } catch (err) {
      setCaricoError(err.message || "Errore salvataggio carico");
    } finally {
      setCaricoSaving(false);
    }
  };

  const fetchSuppliers = async (term = "") => {
    setSuppliersLoading(true);
    try {
      const params = new URLSearchParams({
        search: term,
        tipo: "fornitori",
        limit: term ? "500" : "1500"
      });
      const res = await fetch(`${API_BASE}/api/warehouse/fornitori?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento fornitori");
      const payload = await res.json();
      setSuppliers(payload.data || []);
    } catch {
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const fetchArticles = async (term = "") => {
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams({ search: term, limit: term ? "300" : "50" });
      const res = await fetch(`${API_BASE}/api/warehouse/articoli?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento articoli");
      const payload = await res.json();
      setArticles(payload.data || []);
    } catch {
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  };

  const toggleRowExpand = (code) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("it-IT");
  };

  const sortIndicator = (key) => {
    if (sortKey !== key || !sortDir) return "fa-sort";
    return sortDir === "asc" ? "fa-sort-up" : "fa-sort-down";
  };

  useEffect(() => {
    const closeRowMenu = () => setRowMenu({ open: false, x: 0, y: 0, item: null });
    window.addEventListener("resize", closeRowMenu);
    window.addEventListener("scroll", closeRowMenu, true);
    document.addEventListener("mousedown", closeRowMenu);
    return () => {
      window.removeEventListener("resize", closeRowMenu);
      window.removeEventListener("scroll", closeRowMenu, true);
      document.removeEventListener("mousedown", closeRowMenu);
    };
  }, []);

  return (
    <AppLayout
      fullscreen
      contextLabel="Magazzino"
      pageTitle="Giacenze"
      brandContext="Magazzino"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-6 px-3 py-6 min-w-0 w-full max-w-full overflow-x-hidden sm:px-6"
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div
          ref={toolbarRef}
          className="warehouse-toolbar flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible px-3 py-2 sm:flex-wrap sm:overflow-x-hidden sm:px-4 sm:py-3 min-w-0"
          onScroll={() => setOpenMenu("")}
        >
          <div className="relative">
            <button
              ref={movimentiBtnRef}
              type="button"
              onClick={() => toggleMenu("movimenti")}
              className="flex min-w-[190px] items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-arrow-right-arrow-left text-[13px]" aria-hidden="true" />
                Gestione Movimenti
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-[var(--muted)]" aria-hidden="true" />
            </button>
            {openMenu === "movimenti" ? (
              <div
                className="fixed z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
                style={{ left: menuPos.left, top: menuPos.top, width: Math.max(menuPos.width, 260) }}
                onMouseLeave={() => setOpenMenu("")}
              >
                {[
                  { label: "Carico Merce", icon: "fa-arrow-turn-down" },
                  { label: "Scarico Merce", icon: "fa-arrow-turn-up" },
                  { label: "Lista Movimenti", icon: "fa-list" },
                  { label: "Emissione DDT", icon: "fa-file-signature" }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-[var(--hover)]"
                    onClick={() => {
                      if (item.label === "Carico Merce") {
                        setOpenMenu("");
                        openCausaliPicker("carico");
                      }
                    }}
                  >
                    <i className={`fa-solid ${item.icon} text-[12px] text-[var(--muted)]`} aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              ref={strumentiBtnRef}
              type="button"
              onClick={() => toggleMenu("strumenti")}
              className="flex min-w-[150px] items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-screwdriver-wrench text-[13px]" aria-hidden="true" />
                Strumenti
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-[var(--muted)]" aria-hidden="true" />
            </button>
            {openMenu === "strumenti" ? (
              <div
                className="fixed z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
                style={{ left: menuPos.left, top: menuPos.top, width: Math.max(menuPos.width, 290) }}
                onMouseLeave={() => setOpenMenu("")}
              >
                {[
                  { label: "Ricerca per QR", icon: "fa-qrcode" },
                  { label: "Pianta Magazzino", icon: "fa-map" },
                  { label: "Controlla Allocazione", icon: "fa-clipboard-check" },
                  { label: "Controlla Contiguita Seriali", icon: "fa-link" },
                  { label: "Valorizzazione", icon: "fa-scale-balanced" }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-[var(--hover)]"
                  >
                    <i className={`fa-solid ${item.icon} text-[12px] text-[var(--muted)]`} aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="warehouse-section flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 min-w-0 w-full max-w-full overflow-x-hidden">
        <div className="min-w-0">
          <div className="flex min-w-0 items-end">
            <div className="flex-1 min-w-0">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Ricerca</label>
              <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => fetchData()}
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
                  placeholder="Codice articolo o descrizione"
                  className="ml-3 w-full bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  className={`ml-2 flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition ${
                    alertsOnly ? "bg-rose-500/20 text-rose-400" : "hover:bg-[var(--hover)]"
                  }`}
                  onClick={() => {
                    setPage(1);
                    setAlertsOnly((prev) => !prev);
                  }}
                  aria-label="Solo alert"
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
              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between">
                  <span>Solo sotto scorta</span>
                  <input
                    type="checkbox"
                    checked={alertsOnly}
                    onChange={(event) => {
                      setPage(1);
                      setAlertsOnly(event.target.checked);
                    }}
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Escludi obsoleti</span>
                  <input type="checkbox" className="h-4 w-4" disabled />
                </label>
                <label className="flex items-center justify-between">
                  <span>Solo disponibili</span>
                  <input type="checkbox" className="h-4 w-4" disabled />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min qty"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                    disabled
                  />
                  <input
                    type="number"
                    placeholder="Max qty"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            Totale articoli: <span className="text-[var(--page-fg)]">{formatNumber(total)}</span>
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>Righe</span>
              <select
                value={limit}
                onChange={(event) => {
                  const value = event.target.value;
                  setLimit(value === "all" ? "all" : parseInt(value, 10));
                }}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--page-fg)]"
              >
                <option value="10">10</option>
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

        {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <div className="w-full">
            <table className="warehouse-table w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
                <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <th className="h-10 px-3 w-10"></th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("codiceArticolo")}
                    >
                      Codice
                      <i className={`fa-solid ${sortIndicator("codiceArticolo")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("descrizione")}
                    >
                      Descrizione
                      <i className={`fa-solid ${sortIndicator("descrizione")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("giacenzaFiscale")}
                    >
                      Giacenza fiscale
                      <i className={`fa-solid ${sortIndicator("giacenzaFiscale")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("giacenzaFisica")}
                    >
                      Giacenza fisica
                      <i className={`fa-solid ${sortIndicator("giacenzaFisica")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("unitaMisura")}
                    >
                      U.M.
                      <i className={`fa-solid ${sortIndicator("unitaMisura")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("giacenzaMinima")}
                    >
                      Giacenza minima
                      <i className={`fa-solid ${sortIndicator("giacenzaMinima")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="h-10 px-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => handleSortClick("alert")}
                    >
                      Alert
                      <i className={`fa-solid ${sortIndicator("alert")} text-[10px]`} aria-hidden="true" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => {
                  const min = item.giacenzaMinima || 0;
                  const alert = item.giacenzaFisica < min;
                  const expanded = expandedRows.has(item.codiceArticolo);
                  const canExpand = Number(item.giacenzaFisica || 0) > 1;
                  return (
                    <Fragment key={item.codiceArticolo}>
                      <tr
                        key={item.codiceArticolo}
                        className={`border-b border-[var(--border)] ${
                          rowMenu.open && rowMenu.item?.codiceArticolo === item.codiceArticolo
                            ? "bg-emerald-500/15"
                            : alert
                              ? "bg-rose-500/20"
                              : ""
                        }`}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setRowMenu({
                            open: true,
                            x: event.clientX,
                            y: event.clientY,
                            item
                          });
                        }}
                      >
                        <td className="px-3 py-2">
                          {canExpand ? (
                            <button
                              type="button"
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!expanded) {
                                  fetchSerials(item.codiceArticolo);
                                }
                                toggleRowExpand(item.codiceArticolo);
                              }}
                            >
                              <i
                                className={`fa-solid fa-caret-right text-[12px] transition ${
                                  expanded ? "rotate-90" : ""
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-semibold">{item.codiceArticolo}</td>
                        <td className="px-3 py-2">{item.descrizione}</td>
                        <td className="px-3 py-2">{formatNumber(item.giacenzaFiscale)}</td>
                        <td className="px-3 py-2">{formatNumber(item.giacenzaFisica)}</td>
                        <td className="px-3 py-2">{item.unitaMisura || "-"}</td>
                        <td className="px-3 py-2">{formatNumber(item.giacenzaMinima)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                              alert ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {alert ? "Sotto scorta" : "OK"}
                          </span>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-strong)]">
                          <td colSpan={8} className="px-6 py-3 text-sm text-[var(--muted)]">
                            {serialsLoading[item.codiceArticolo] ? (
                              <span>Caricamento seriali...</span>
                            ) : serialsByCode[item.codiceArticolo]?.length ? (
                              <div className="overflow-auto rounded-md border border-[var(--border)]">
                                <table className="w-full text-xs">
                                  <thead className="bg-[var(--surface)] text-[var(--muted)]">
                                    <tr className="text-left uppercase tracking-[0.2em]">
                                      <th className="px-3 py-2">Articolo</th>
                                      <th className="px-3 py-2">Seriale</th>
                                      <th className="px-3 py-2">Data ingresso</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {serialsByCode[item.codiceArticolo].map((row, idx) => (
                                      <tr
                                        key={`${row.seriale || "serial"}-${idx}`}
                                        className={`border-t border-[var(--border)] ${row.placeholder ? "text-rose-400" : ""}`}
                                      >
                                        <td className="px-3 py-2">{row.codiceArticolo}</td>
                                        <td className="px-3 py-2">{row.seriale || "-"}</td>
                                        <td className="px-3 py-2">{formatDate(row.dataMovimento)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <span>Nessun numero di serie disponibile.</span>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {!loading && pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-[var(--muted)]">
                      Nessun articolo trovato.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {rowMenu.open ? (
        <div
          className="fixed z-50 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
          style={{ left: rowMenu.x, top: rowMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <i className="fa-solid fa-eye text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Visualizza
          </button>
          <div className="my-1 h-px w-full bg-[var(--border)]" aria-hidden="true" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
            onClick={() => {
              setCaricoScaricoMode("carico");
              setRowMenu({ open: false, x: 0, y: 0, item: rowMenu.item });
            }}
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Carica
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
            onClick={() => {
              setCaricoScaricoMode("scarico");
              setRowMenu({ open: false, x: 0, y: 0, item: rowMenu.item });
            }}
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-[12px] text-[var(--muted)] rotate-180" aria-hidden="true" />
            Scarica
          </button>
          <div className="my-1 h-px w-full bg-[var(--border)]" aria-hidden="true" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <i className="fa-solid fa-pen-to-square text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Modifica
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <i className="fa-solid fa-copy text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Duplica
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <i className="fa-solid fa-plus text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Nuovo
          </button>
        </div>
      ) : null}

      {causaliOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8"
          onMouseDown={() => setCausaliOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Carico di magazzino</p>
                <h2 className="mt-1 text-xl font-semibold">Seleziona causale di carico</h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setCausaliOpen(false)}
                aria-label="Chiudi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={causaliSoloNonNascoste}
                  onChange={(event) => {
                    const value = event.target.checked;
                    setCausaliSoloNonNascoste(value);
                    fetchCausali(causaliType, value);
                  }}
                  className="h-4 w-4"
                />
                Mostra solo causali non nascoste
              </label>
              {causaliLoading ? <span className="text-xs text-[var(--muted)]">Caricamento...</span> : null}
            </div>

            {causaliError ? <p className="mt-2 text-sm text-rose-500">{causaliError}</p> : null}

            <div className="mt-3 max-h-[50vh] overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-xs leading-tight">
                <thead className="sticky top-0 z-10 bg-[var(--surface-strong)] text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  <tr className="text-left">
                    <th className="px-2.5 py-1.5">Descrizione movimento</th>
                    <th className="px-2.5 py-1.5">Deposito iniziale</th>
                    <th className="px-2.5 py-1.5">Deposito finale</th>
                    <th className="px-2.5 py-1.5">Nascondi</th>
                    <th className="px-2.5 py-1.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {causali.map((row) => (
                    <tr
                      key={row.cod}
                      className={`border-t border-[var(--border)] ${
                        selectedCausale?.cod === row.cod ? "bg-emerald-500/10" : ""
                      }`}
                      onClick={() => setSelectedCausale(row)}
                    >
                      <td className="px-2.5 py-1.5 font-semibold">{row.descrizioneMovimento}</td>
                      <td className="px-2.5 py-1.5">{row.depositoInizialeNome}</td>
                      <td className="px-2.5 py-1.5">{row.depositoFinaleNome}</td>
                      <td className="px-2.5 py-1.5">
                        <input type="checkbox" checked={row.nascondi} readOnly className="h-3.5 w-3.5" />
                      </td>
                      <td className="px-2.5 py-1.5 text-[var(--muted)]">{row.note || "-"}</td>
                    </tr>
                  ))}
                  {!causaliLoading && causali.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                        Nessuna causale trovata.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Causale selezionata:{" "}
                <span className="text-[var(--page-fg)]">{selectedCausale?.descrizioneMovimento || "-"}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
                  onClick={() => setCausaliOpen(false)}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                  disabled={!selectedCausale}
                  onClick={() => {
                    setCausaliOpen(false);
                    setCaricoWizardOpen(true);
                  }}
                >
                  Procedi
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {caricoWizardOpen ? (
        <div className="fixed inset-0 z-[60] overflow-hidden bg-[var(--page-bg)] text-[var(--page-fg)]">
          <div className="h-full w-full overflow-y-auto overflow-x-hidden lg:overflow-hidden">
            <div className="flex min-h-full w-full flex-col bg-[var(--surface)] lg:h-full lg:overflow-hidden">
              <div className="relative border-b border-[var(--border)] px-4 py-3">
                <div className="pr-12">
                  <h2 className="text-lg font-semibold">Carico Merce</h2>
                </div>
                <button
                  type="button"
                  className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
                  onClick={() => setCaricoWizardOpen(false)}
                  aria-label="Chiudi"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                <div className="mt-3 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
                  <div ref={supplierComboRef} className="relative min-w-0 w-full lg:max-w-md">
                    <div className="flex h-11 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3">
                      <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                      <input
                        value={supplierSearch}
                        onFocus={() => setSupplierComboOpen(true)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSupplierSearch(value);
                          setSupplierComboOpen(true);
                          const exact = suppliers.find((row) => String(row.nominativo || "") === value);
                          setSelectedSupplier(exact || null);
                        }}
                        placeholder="Cerca fornitore"
                        className="ml-3 w-full bg-transparent text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setSupplierComboOpen((prev) => !prev)}
                        className="ml-2 text-[var(--muted)]"
                        aria-label="Apri elenco fornitori"
                      >
                        <i
                          className={`fa-solid fa-chevron-down text-[12px] transition-transform ${supplierComboOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {supplierComboOpen ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                        {suppliersLoading ? <p className="px-3 py-2 text-xs text-[var(--muted)]">Loading suppliers...</p> : null}
                        {!suppliersLoading &&
                        suppliers.filter((row) => {
                          const term = supplierSearch.trim().toLowerCase();
                          if (!term) return true;
                          return (
                            String(row.nominativo || "").toLowerCase().includes(term) ||
                            String(row.piva || "").toLowerCase().includes(term)
                          );
                        }).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[var(--muted)]">No suppliers found.</p>
                        ) : null}
                        {!suppliersLoading
                          ? suppliers
                              .filter((row) => {
                                const term = supplierSearch.trim().toLowerCase();
                                if (!term) return true;
                                return (
                                  String(row.nominativo || "").toLowerCase().includes(term) ||
                                  String(row.piva || "").toLowerCase().includes(term)
                                );
                              })
                              .map((row) => (
                                <button
                                  key={row.cod}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupplier(row);
                                    setSupplierSearch(row.nominativo || "");
                                    setSupplierComboOpen(false);
                                  }}
                                  className={`flex w-full items-start justify-between gap-3 border-t border-[var(--border)] px-3 py-2 text-left text-sm first:border-t-0 ${
                                    selectedSupplier?.cod === row.cod ? "bg-emerald-500/10" : "hover:bg-[var(--hover)]"
                                  }`}
                                >
                                  <span className="truncate font-semibold">{row.nominativo || "-"}</span>
                                  <span className="text-xs text-[var(--muted)]">{row.piva || "-"}</span>
                                </button>
                              ))
                          : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden h-11 items-center gap-2 text-[var(--muted)] sm:flex">
                    <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
                  </div>

                  <div className="relative min-w-0 w-full lg:w-auto">
                    <select
                      className="h-11 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 pr-9 text-sm font-semibold lg:min-w-[260px]"
                      value={selectedCausale?.cod ?? ""}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        const found = causali.find((row) => row.cod === value);
                        setSelectedCausale(found || null);
                      }}
                    >
                      <option value="">Seleziona movimento</option>
                      {causali.map((row) => (
                        <option key={row.cod} value={row.cod}>
                          {row.descrizioneMovimento}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--muted)]">
                      <i className="fa-solid fa-chevron-down text-[12px]" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="min-w-0 w-full lg:w-auto">
                    <input
                      type="datetime-local"
                      value={caricoDateTimeLocal}
                      onChange={(event) => setCaricoDateTimeLocal(event.target.value)}
                      className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm lg:min-w-[220px]"
                    />
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-visible overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:overflow-y-auto">
                <div className="flex min-h-0 flex-col gap-4 lg:h-full">
                <section className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Codice</p>
                      <p className="mt-1 truncate text-sm font-semibold">{selectedArticle?.codiceArticolo || "-"}</p>
                    </div>
                    <div className="min-w-0 lg:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione</p>
                      <p className="mt-1 truncate text-sm font-semibold">{selectedArticle?.descrizione || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">U.M.</p>
                      <p className="mt-1 truncate text-sm font-semibold">{selectedArticle?.unitaMisura || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Costo unitario</p>
                      <p className="mt-1 truncate text-sm font-semibold">
                        {selectedArticle?.costoUnitario ? `EUR ${formatNumber(selectedArticle.costoUnitario)}` : "-"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Part number</p>
                      <p className="mt-1 truncate text-sm font-semibold">{selectedArticle?.partNumber || "-"}</p>
                    </div>
                  </div>
                </section>

                <section className="w-full bg-[var(--surface)] p-0 lg:min-h-0 lg:flex-1">
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:h-full lg:min-h-0 lg:grid-cols-2 lg:items-stretch">
                    <div className="flex min-h-[300px] min-w-0 flex-col rounded-lg bg-[var(--surface)] p-3 sm:p-4 lg:min-h-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Archivio articoli</p>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                          aria-label="Nuovo articolo"
                          onClick={() => setNewArticleOpen(true)}
                        >
                          <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                        <input
                          value={articleSearch}
                          onChange={(event) => setArticleSearch(event.target.value)}
                          placeholder="Cerca per codice o descrizione"
                          className="ml-3 w-full bg-transparent text-sm outline-none"
                        />
                        {articlesLoading ? <span className="ml-2 text-xs text-[var(--muted)]">Caricamento...</span> : null}
                      </div>
                    <div className="mt-3 h-[42vh] min-h-[240px] max-h-[380px] overflow-auto rounded-md border border-[var(--border)] lg:min-h-0 lg:h-auto lg:max-h-none lg:flex-1">
                        <table className={`min-w-[460px] w-full ${compactCaricoLayout ? "text-[10px]" : "text-xs"}`}>
                          <thead className={`sticky top-0 z-10 bg-[var(--surface-strong)] uppercase tracking-[0.2em] text-[var(--muted)] ${compactCaricoLayout ? "text-[8px]" : "text-[9px]"}`}>
                            <tr className="text-left">
                              <th className="px-3 py-2">Codice</th>
                              <th className="px-3 py-2">Descrizione</th>
                              <th className="px-3 py-2">U.M.</th>
                              <th className="px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {articles.map((row) => (
                              <tr
                                key={row.codiceArticolo}
                                className={`group border-t border-[var(--border)] ${
                                  selectedArticle?.codiceArticolo === row.codiceArticolo ? "bg-emerald-500/10" : ""
                                }`}
                                onClick={() => setSelectedArticle(row)}
                              >
                                <td className={`px-3 py-2 font-semibold ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.codiceArticolo}</td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.descrizione}</td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.unitaMisura || "-"}</td>
                                <td className="px-2 py-2 text-right">
                                  <button
                                    type="button"
                                    className="h-7 w-7 rounded-md border border-[var(--border)] text-[var(--muted)] opacity-100 transition hover:bg-[var(--hover)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                    aria-label="Aggiungi riga movimento"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      addMovementItemFromArticle(row);
                                    }}
                                  >
                                    <i className="fa-solid fa-arrow-down text-[11px] sm:hidden" aria-hidden="true" />
                                    <i className="fa-solid fa-arrow-right hidden text-[11px] sm:inline-block" aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {!articlesLoading && articles.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-xs text-[var(--muted)]">
                                  Nessun articolo trovato.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex min-h-[300px] min-w-0 flex-col rounded-lg bg-[var(--surface)] p-3 sm:p-4 lg:min-h-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Righe movimento</p>
                        <span className="text-xs text-[var(--muted)]">{movementItems.length} righe</span>
                      </div>
                      <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 opacity-70">
                        <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                        <input
                          value=""
                          readOnly
                          tabIndex={-1}
                          placeholder="Filtro righe movimento"
                          className="ml-3 w-full cursor-default bg-transparent text-sm outline-none"
                        />
                      </div>
                      <div className="mt-3 h-[42vh] min-h-[240px] max-h-[380px] overflow-auto rounded-md border border-[var(--border)] lg:min-h-0 lg:h-auto lg:max-h-none lg:flex-1">
                        <table className={`min-w-[760px] w-full ${compactCaricoLayout ? "text-[10px]" : "text-xs"}`}>
                          <thead className={`sticky top-0 bg-[var(--surface-strong)] uppercase tracking-[0.2em] text-[var(--muted)] ${compactCaricoLayout ? "text-[8px]" : "text-[9px]"}`}>
                            <tr className="text-left">
                              <th className="px-3 py-2">Codice articolo</th>
                              <th className="px-3 py-2">Seriale</th>
                              <th className="px-3 py-2">Scaffale</th>
                              <th className="px-3 py-2">Riga</th>
                              <th className="px-3 py-2">Colonna</th>
                              <th className="px-3 py-2">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {movementItems.map((row) => (
                              <tr
                                key={row.id}
                                className={`group cursor-pointer border-t border-[var(--border)] ${
                                  selectedMovementItemId === row.id ? "bg-emerald-500/10" : ""
                                }`}
                                onClick={() => setSelectedMovementItemId(row.id)}
                              >
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="h-7 w-7 shrink-0 rounded-md border border-[var(--border)] text-[var(--muted)] opacity-100 transition hover:bg-[var(--hover)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                      aria-label="Rimuovi riga movimento"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeMovementItemById(row.id);
                                      }}
                                    >
                                      <i className="fa-solid fa-arrow-up text-[11px] sm:hidden" aria-hidden="true" />
                                      <i className="fa-solid fa-arrow-left hidden text-[11px] sm:inline-block" aria-hidden="true" />
                                    </button>
                                    <span>{row.articolo?.codiceArticolo || "-"}</span>
                                  </div>
                                </td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.seriali?.[0] || "-"}</td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.articolo?.scaffale || "-"}</td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.articolo?.riga || "-"}</td>
                                <td className={`px-3 py-2 ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.articolo?.colonna || "-"}</td>
                                <td className={`px-3 py-2 text-[var(--muted)] ${compactCaricoLayout ? "text-[11px]" : "text-[12px]"}`}>{row.note || "-"}</td>
                              </tr>
                            ))}
                            {movementItems.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-3 py-4 text-center text-xs text-[var(--muted)]">
                                  Nessuna riga inserita.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="relative hidden lg:block lg:py-1">
                  <div className="h-[2px] w-full bg-[var(--border)]" />
                  <button
                    type="button"
                    title={desktopExtraCardsCollapsed ? "ESPANDI dettagli" : "COMPRIMI dettagli"}
                    onClick={() => {
                      if (compactCaricoLayout) return;
                      setDesktopExtraCardsCollapsed((prev) => !prev);
                    }}
                    className="absolute left-1/2 top-1/2 inline-flex h-6 min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--muted)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-expanded={!desktopExtraCardsCollapsed}
                    aria-controls="carico-extra-cards"
                    aria-label={desktopExtraCardsCollapsed ? "Espandi dettagli card inferiori" : "Comprimi dettagli card inferiori"}
                    disabled={compactCaricoLayout}
                  >
                    <i
                      className={`fa-solid text-[11px] ${desktopExtraCardsCollapsed ? "fa-caret-down" : "fa-caret-up"}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div
                  className={`max-h-none overflow-visible opacity-100 lg:overflow-hidden lg:transition-[max-height,opacity] lg:duration-300 lg:ease-out ${
                    desktopExtraCardsCollapsed || compactCaricoLayout ? "lg:max-h-0 lg:opacity-0 lg:pointer-events-none" : "lg:max-h-[520px] lg:opacity-100"
                  }`}
                >
                <section
                  id="carico-extra-cards"
                  className="grid w-full items-start gap-3 lg:grid-cols-12 lg:items-stretch lg:gap-4"
                >
                  <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 lg:col-span-6 lg:flex lg:flex-col lg:p-2.5">
                    <p className={`${compactCaricoLayout ? "text-[10px]" : "text-[11px]"} uppercase tracking-[0.2em] text-[var(--muted)]`}>Registrazione DDT</p>
                    <label className="mt-2 block text-xs lg:mt-1.5">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Codice</span>
                      <input
                        type="text"
                        value={ddtCode}
                        onChange={(event) => setDdtCode(event.target.value)}
                        className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs lg:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                        placeholder="Inserisci codice DDT"
                      />
                    </label>
                    <input
                      ref={ddtPdfInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleDdtFileSelection}
                    />
                    <div className="mt-2 grid gap-2 lg:min-h-[120px] lg:flex-1 lg:grid-cols-[382fr_618fr]">
                      <button
                        type="button"
                        onClick={() => ddtPdfInputRef.current?.click()}
                        className="flex h-20 w-full flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-3 text-center hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:h-full"
                        aria-label="Carica documenti per registrazione DDT"
                      >
                        <i className="fa-solid fa-file-arrow-up text-lg text-[var(--muted)]" aria-hidden="true" />
                        <span className={`mt-1 font-semibold ${compactCaricoLayout ? "text-[10px]" : "text-[11px]"}`}>Carica documenti</span>
                        {ddtUploadedFiles.length > 0 ? (
                          <span className="mt-1 text-[10px] text-[var(--muted)]">{ddtUploadedFiles.length} file</span>
                        ) : null}
                      </button>

                      <div className="min-w-0 overflow-hidden rounded-md border border-[var(--border)]">
                        <div className="h-full overflow-y-auto overflow-x-hidden pr-1">
                          <table className={`w-full table-fixed ${compactCaricoLayout ? "text-[10px]" : "text-[11px]"}`}>
                            <tbody>
                              {ddtUploadedFiles.map((row) => (
                                <tr key={row.id} className="border-t border-[var(--border)] first:border-t-0">
                                  <td className="px-2 py-1.5">
                                    <p className="truncate" title={row.file.name}>
                                      {row.file.name}
                                    </p>
                                  </td>
                                  <td className="w-[180px] px-2 py-1.5">
                                    <select
                                      value={row.docType}
                                      onChange={(event) => handleDdtFileTypeChange(row.id, event.target.value)}
                                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                                      aria-label={`Tipo documento per ${row.file.name}`}
                                    >
                                      {DDT_FILE_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                              {ddtUploadedFiles.length === 0 ? (
                                <tr>
                                  <td colSpan={2} className="px-2 py-3 text-center text-[10px] text-[var(--muted)]">
                                    Nessun documento caricato.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={importDataFromDdt}
                      disabled={ddtImporting || !ddtUploadedFiles.some((row) => row.docType === "ddt")}
                      className="mt-2 w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-3 lg:py-1.5"
                    >
                      {ddtImporting ? "Importazione in corso..." : "Importa dati da DDT"}
                    </button>
                  </div>

                  <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 lg:col-span-3 lg:flex lg:flex-col lg:p-2.5">
                    <p className={`${compactCaricoLayout ? "text-[10px]" : "text-[11px]"} uppercase tracking-[0.2em] text-[var(--muted)]`}>Photo Upload / P/N OEM / Note</p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="mt-2 flex h-16 w-full items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-xs font-semibold hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:h-10"
                    >
                      {photoFile?.name || "Upload foto articolo"}
                    </button>
                    <button
                      type="button"
                      onClick={scanLabelWithAi}
                      disabled={labelScanning || !photoFile}
                      className="mt-2 w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60 lg:py-1.5"
                    >
                      {labelScanning ? "Scansione AI..." : "Scansiona etichetta (AI)"}
                    </button>
                    <label className="mt-2 block text-xs lg:mt-1.5">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">P/N OEM</span>
                      <input
                        type="text"
                        value={oemPartNumber}
                        onChange={(event) => setOemPartNumber(event.target.value)}
                        className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:py-1.5"
                        placeholder="Inserisci part number OEM"
                      />
                    </label>
                    <label className="mt-2 block text-xs lg:mt-1.5">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Note</span>
                      <textarea
                        value={movementNotes}
                        onChange={(event) => setMovementNotes(event.target.value)}
                        rows={2}
                        className="mt-1.5 h-16 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:h-10 lg:py-1.5"
                        placeholder="Inserisci note"
                      />
                    </label>
                  </div>

                  <div className="h-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 lg:col-span-3 lg:p-2.5">
                    <p className={`${compactCaricoLayout ? "text-[10px]" : "text-[11px]"} uppercase tracking-[0.2em] text-[var(--muted)]`}>Costo di acquisto</p>
                    <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 lg:py-1.5">
                      <span className={`mr-3 text-[var(--muted)] ${compactCaricoLayout ? "text-xs" : "text-sm"}`}>EUR</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={purchaseCost}
                        onChange={(event) => setPurchaseCost(event.target.value)}
                        className={`w-full bg-transparent font-semibold leading-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${compactCaricoLayout ? "text-lg lg:text-xl" : "text-xl lg:text-[28px]"}`}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </section>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-2">
                  <button
                    type="button"
                    onClick={() => setCaricoWizardOpen(false)}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--hover)]"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={submitCarico}
                    disabled={caricoSaving || !selectedCausale || !selectedSupplier || movementItems.length === 0}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {caricoSaving ? "Salvataggio..." : "Conferma carico"}
                  </button>
                </div>

                {aiAssistError ? <p className="text-sm text-rose-500">{aiAssistError}</p> : null}
                {aiAssistInfo ? <p className="text-sm text-emerald-500">{aiAssistInfo}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {newArticleOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/85 px-3 py-3 sm:items-center sm:px-4 sm:py-8"
          onMouseDown={() => setNewArticleOpen(false)}
        >
          <div
            className="my-auto flex w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-4rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Nuovo articolo</p>
                <h2 className="mt-1 text-xl font-semibold">Anagrafica articolo</h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setNewArticleOpen(false)}
                aria-label="Chiudi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm lg:col-span-2">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Codice articolo</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Marca</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Tipo</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Unita di misura</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Centro di costo</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Valorizza</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Ammette seriale</span>
                </label>
              </div>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Prezzo di vendita</span>
                <input
                  type="number"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Costo di acquisto</span>
                <input
                  type="number"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm lg:col-span-2">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Part number</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm lg:col-span-2">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Vendor code</span>
                <input
                  type="text"
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>

              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Alert giacenza minima</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Attiva alert per questo codice</span>
                </div>
                <label className="mt-3 text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Soglia alert</span>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Obsoleto</p>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Marca articolo come obsoleto</span>
                </label>
              </div>
            </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
                onClick={() => setNewArticleOpen(false)}
              >
                Chiudi
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </AppLayout>
  );
}
