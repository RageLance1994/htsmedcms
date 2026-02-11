import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("it-IT");
};

export default function WarehouseGiacenze() {
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
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [articleSearch, setArticleSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [entryQty, setEntryQty] = useState(1);
  const [entryUnit, setEntryUnit] = useState("QT");
  const [movementItems, setMovementItems] = useState([]);
  const [caricoSaving, setCaricoSaving] = useState(false);
  const [caricoError, setCaricoError] = useState("");
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [serialsByCode, setSerialsByCode] = useState({});
  const [serialsLoading, setSerialsLoading] = useState({});

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
    if (!term) return;
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
    if (supplierSearch.trim().length >= 2) {
      fetchSuppliers(supplierSearch.trim());
    }
    if (articleSearch.trim().length >= 2) {
      fetchArticles(articleSearch.trim());
    }
  }, [caricoWizardOpen, supplierSearch, articleSearch, suppliers.length, articles.length]);

  useEffect(() => {
    if (selectedArticle?.unitaMisura) {
      setEntryUnit(selectedArticle.unitaMisura);
    } else {
      setEntryUnit("QT");
    }
  }, [selectedArticle]);

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
    setMovementItems((prev) => [
      ...prev,
      {
        id: `${selectedArticle.codiceArticolo}-${Date.now()}`,
        articolo: selectedArticle,
        quantita: qty,
        seriali: [],
        note: ""
      }
    ]);
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
      const params = new URLSearchParams({ search: term, limit: term ? "200" : "50" });
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
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-strong)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <tr className="text-left">
                    <th className="px-3 py-2">Descrizione movimento</th>
                    <th className="px-3 py-2">Deposito iniziale</th>
                    <th className="px-3 py-2">Deposito finale</th>
                    <th className="px-3 py-2">Nascondi</th>
                    <th className="px-3 py-2">Note</th>
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
                      <td className="px-3 py-2 font-semibold">{row.descrizioneMovimento}</td>
                      <td className="px-3 py-2">{row.depositoInizialeNome}</td>
                      <td className="px-3 py-2">{row.depositoFinaleNome}</td>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.nascondi} readOnly className="h-4 w-4" />
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">{row.note || "-"}</td>
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
        <div className="fixed inset-0 z-[60] bg-[var(--page-bg)] text-[var(--page-fg)]">
          <div className="relative flex h-full flex-col">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
              onClick={() => setCaricoWizardOpen(false)}
              aria-label="Chiudi"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>

            <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shrink-0">
                <div className="flex gap-4">
                  <div className="flex w-[75%] flex-col">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Fornitore</p>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                        aria-label="Nuovo fornitore"
                      >
                        <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                      <i className="fa-solid fa-magnifying-glass text-[12px] text-[var(--muted)]" aria-hidden="true" />
                      <input
                        value={supplierSearch}
                        onChange={(event) => setSupplierSearch(event.target.value)}
                        placeholder="Cerca fornitore"
                        className="ml-3 w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="mt-3 max-h-[15vh] overflow-auto rounded-md border border-[var(--border)]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--surface-strong)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                          <tr>
                            <th className="px-3 py-2 text-left">Nominativo</th>
                            <th className="px-3 py-2 text-left">P.IVA</th>
                            <th className="px-3 py-2 text-left">Indirizzo</th>
                            <th className="px-3 py-2 text-left">Citta</th>
                            <th className="px-3 py-2 text-left">Agenzia di riferimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suppliers.map((row) => (
                            <tr
                              key={row.cod}
                              className={`border-t border-[var(--border)] ${
                                selectedSupplier?.cod === row.cod ? "bg-emerald-500/10" : ""
                              }`}
                              onClick={() => setSelectedSupplier(row)}
                            >
                              <td className="px-3 py-2 font-semibold">{row.nominativo}</td>
                              <td className="px-3 py-2">{row.piva || "-"}</td>
                              <td className="px-3 py-2">{row.indirizzo || "-"}</td>
                              <td className="px-3 py-2">{row.citta || "-"}</td>
                              <td className="px-3 py-2">{row.agenziaRiferimento || "-"}</td>
                            </tr>
                          ))}
                          {!suppliersLoading && suppliers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                                Nessun fornitore trovato.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    <label className="text-sm">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Data movimento</span>
                      <input
                        type="date"
                        value={caricoDate}
                        onChange={(event) => setCaricoDate(event.target.value)}
                        className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Tipo di carico</span>
                      <select
                        className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        value={selectedCausale?.cod ?? ""}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          const found = causali.find((c) => c.cod === value);
                          setSelectedCausale(found || null);
                        }}
                      >
                        <option value="">Seleziona causale</option>
                        {causali.map((row) => (
                          <option key={row.cod} value={row.cod}>
                            {row.descrizioneMovimento}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden lg:flex-row">
                <section className="flex min-h-0 w-[22%] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Anteprima articolo</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Descrizione</p>
                      <p className="mt-1 font-semibold">{selectedArticle?.descrizione || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Codice articolo</p>
                      <p className="mt-1 font-semibold">{selectedArticle?.codiceArticolo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Costo unitario</p>
                      <p className="mt-1 font-semibold">
                        {selectedArticle?.costoUnitario ? `€ ${formatNumber(selectedArticle.costoUnitario)}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Unita di misura</p>
                      <p className="mt-1 font-semibold">{selectedArticle?.unitaMisura || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Costo di acquisto</p>
                      <p className="mt-1 font-semibold">
                        {selectedArticle?.costoAcquisto ? `€ ${formatNumber(selectedArticle.costoAcquisto)}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Part number</p>
                      <p className="mt-1 font-semibold">{selectedArticle?.partNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Scaffale</p>
                      <p className="mt-1 font-semibold">{selectedArticle?.scaffale || "-"}</p>
                    </div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="border-b border-[var(--border)] pb-3">
                  <div className="flex items-center justify-between">
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
                    {articlesLoading ? (
                      <span className="ml-2 text-xs text-[var(--muted)]">Caricamento...</span>
                    ) : null}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--surface-strong)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      <tr className="text-left">
                        <th className="px-3 py-2 overflow-hidden [resize:horizontal] border-l border-[var(--border-strong,var(--border))]">Codice</th>
                        <th className="px-3 py-2 overflow-hidden [resize:horizontal] border-l border-[var(--border-strong,var(--border))]">Descrizione</th>
                        <th className="px-3 py-2 overflow-hidden [resize:horizontal] border-l border-[var(--border-strong,var(--border))]">U.M.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map((row) => (
                        <tr
                          key={row.codiceArticolo}
                          className={`border-t border-[var(--border)] ${
                            selectedArticle?.codiceArticolo === row.codiceArticolo ? "bg-emerald-500/10" : ""
                          }`}
                          onClick={() => setSelectedArticle(row)}
                        >
                          <td className="px-3 py-2 font-semibold truncate border-l border-[var(--border-strong,var(--border))]">{row.codiceArticolo}</td>
                          <td className="px-3 py-2 truncate border-l border-[var(--border-strong,var(--border))]">{row.descrizione}</td>
                          <td className="px-3 py-2 truncate border-l border-[var(--border-strong,var(--border))]">{row.unitaMisura || "-"}</td>
                        </tr>
                      ))}
                      {!articlesLoading && articles.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                            Nessun articolo trovato.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="hidden h-full items-center justify-center lg:flex">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 text-xs">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Unita di misura</label>
                    <select
                      value={entryUnit}
                      onChange={(event) => setEntryUnit(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    >
                      <option value="QT">QT</option>
                      <option value="KG">KG</option>
                      <option value="METRI">METRI</option>
                      <option value="LITRI">LITRI</option>
                    </select>
                  </div>
                  <div className="w-20 text-xs">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Quantita</label>
                    <input
                      type="number"
                      min="1"
                      value={entryQty}
                      onChange={(event) => setEntryQty(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-50"
                    onClick={addMovementItem}
                    disabled={!selectedArticle}
                    aria-label="Aggiungi articolo"
                  >
                    <i className="fa-solid fa-arrow-right text-[12px]" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50 cursor-pointer"
                    onClick={() => setMovementItems((prev) => prev.slice(0, -1))}
                    disabled={movementItems.length === 0}
                    aria-label="Rimuovi ultimo articolo"
                  >
                    <i className="fa-solid fa-arrow-left text-[12px]" aria-hidden="true" />
                  </button>
                </div>
              </div>

                <section className="flex min-h-0 flex-[0.9] flex-col gap-4">
                  <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Righe movimento</p>
                      <span className="text-xs text-[var(--muted)]">{movementItems.length} righe</span>
                    </div>
                    <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[var(--surface-strong)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        <tr className="text-left">
                          <th className="px-3 py-2">Articolo</th>
                          <th className="px-3 py-2">Qt</th>
                          <th className="px-3 py-2">Note</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {movementItems.map((row) => (
                          <tr key={row.id} className="border-t border-[var(--border)]">
                            <td className="px-3 py-2">{row.articolo?.descrizione || row.articolo?.codiceArticolo}</td>
                            <td className="px-3 py-2">{row.quantita}</td>
                            <td className="px-3 py-2 text-[var(--muted)]">{row.note || "-"}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)]"
                                onClick={() => setMovementItems((prev) => prev.filter((item) => item.id !== row.id))}
                              >
                                Rimuovi
                              </button>
                            </td>
                          </tr>
                        ))}
                        {movementItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                              Nessuna riga inserita.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </section>
              </div>

              <section>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex h-full flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">DDT</p>
                    <input
                      type="text"
                      placeholder="Numero DDT"
                      className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                    <div className="mt-3 flex flex-1 items-center justify-center rounded-md border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted)]">
                      Trascina PDF qui
                    </div>
                  </div>

                  <div className="flex h-full flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Foto articolo</p>
                    <div className="mt-3 flex flex-1 items-center justify-center rounded-md border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted)]">
                      Trascina foto qui
                    </div>
                  </div>

                  <div className="flex h-full flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">PN / OEM</p>
                    <input
                      type="text"
                      placeholder="Part number"
                      className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                    <label className="mt-3 flex flex-1 flex-col">
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Note</span>
                      <textarea
                        className="mt-2 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm resize-none"
                        placeholder="Note"
                      />
                    </label>
                  </div>

                  <div className="flex h-full flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Costo per unita</p>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-2xl font-semibold"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-end gap-2">
                  {caricoError ? <p className="mr-auto text-xs text-rose-500">{caricoError}</p> : null}
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
                    onClick={() => setCaricoWizardOpen(false)}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    disabled={!selectedCausale || !selectedSupplier || movementItems.length === 0 || caricoSaving}
                    onClick={submitCarico}
                  >
                    {caricoSaving ? "Salvataggio..." : "Procedi"}
                  </button>
                </div>
              </section>
            </div>

          </div>
        </div>
      ) : null}

      {newArticleOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8"
          onMouseDown={() => setNewArticleOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
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

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
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

            <div className="mt-6 flex items-center justify-end gap-2">
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
