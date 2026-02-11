import { useEffect, useMemo, useRef, useState } from "react";
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

      {caricoScaricoMode ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Modulo</p>
              <h2 className="text-lg font-semibold">
                {caricoScaricoMode === "carico" ? "Carico Merce" : "Scarico Merce"}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
              onClick={() => setCaricoScaricoMode("")}
            >
              Chiudi
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Articolo</p>
              <div className="mt-2 text-sm text-[var(--page-fg)]">{rowMenu.item?.codiceArticolo || "-"}</div>
              <div className="text-xs text-[var(--muted)]">{rowMenu.item?.descrizione || ""}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Quantita</label>
              <input
                type="number"
                className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Deposito</label>
              <select className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <option>Sede</option>
                <option>Cliente</option>
                <option>Fornitore</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Conferma
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
              onClick={() => setCaricoScaricoMode("")}
            >
              Annulla
            </button>
          </div>
        </section>
      ) : null}

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
                    <>
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
                                      <tr key={`${row.seriale || "serial"}-${idx}`} className="border-t border-[var(--border)]">
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
                    </>
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
            <i className="fa-solid fa-arrow-down-from-bracket text-[12px] text-[var(--muted)]" aria-hidden="true" />
            Scarica
          </button>
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
    </AppLayout>
  );
}
