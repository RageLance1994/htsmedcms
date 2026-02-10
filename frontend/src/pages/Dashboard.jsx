import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";

const sections = [
  { title: "ANALISI", icon: "fa-chart-pie", items: [] },
  {
    title: "PRODUTTIVITA",
    icon: "fa-chart-line",
    items: [
      "Offerte",
      "Contratti",
      "Attivita",
      "Clienti e Fornitori",
      "Ordini",
      "Comunicazioni",
      "Quotazioni",
      "Archivio Allegati",
      "Commesse"
    ]
  },
  {
    title: "MAGAZZINO-LAB",
    icon: "fa-warehouse",
    items: [
      "Giacenze",
      "DDT-Doc. di Trasporto",
      "Codici di Magazzino",
      "Causali/Depositi",
      "Lab Riparazioni",
      "CheckList Interne"
    ]
  },
  {
    title: "CONTABILITA",
    icon: "fa-coins",
    items: [
      "Fatture Emesse",
      "Note di Credito Emesse",
      "Fatture Ricevute",
      "Scadenziario",
      "Nota Spese",
      "Analitica",
      "Calcolo IVA",
      "Emolumenti",
      "Banche",
      "Assegni",
      "Scadenze Fiscali",
      "Provvigioni"
    ]
  },
  {
    title: "SERVICE",
    icon: "fa-screwdriver-wrench",
    items: [
      "Interventi e Verbali",
      "Lista Verbali",
      "Sistemi",
      "Contratti Service",
      "Statistiche",
      "Certificazioni Gabbie"
    ]
  },
  { title: "GESTIONE", icon: "fa-sliders", items: [] }
];

const quickStats = [
  { label: "Fatture Scadute", value: "9" },
  { label: "Offerte in attesa", value: "14" },
  { label: "Fatture in scadenza", value: "17" },
  { label: "Contratti in scadenza", value: "5" }
];

const periodOptions = ["Sempre", "Anno in corso", "Anno precedente", "Mese in corso"];

const revenueData = {
  "Sempre": {
    labels: ["2019", "2020", "2021", "2022", "2023", "2024"],
    values: [520, 610, 740, 860, 980, 1120]
  },
  "Anno in corso": {
    labels: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    values: [62, 58, 71, 69, 82, 77, 90, 84, 96, 88, 103, 110]
  },
  "Anno precedente": {
    labels: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    values: [54, 57, 63, 66, 71, 73, 79, 81, 85, 90, 94, 99]
  },
  "Mese in corso": {
    labels: ["Set 1", "Set 2", "Set 3", "Set 4"],
    values: [24, 28, 21, 31]
  }
};

const costCenterData = {
  "Sempre": [
    { label: "Laboratorio", value: 82 },
    { label: "Magazzino", value: 70 },
    { label: "Service", value: 88 },
    { label: "Vendite", value: 76 },
    { label: "Amministrazione", value: 61 },
    { label: "Qualita", value: 73 }
  ],
  "Anno in corso": [
    { label: "Laboratorio", value: 78 },
    { label: "Magazzino", value: 62 },
    { label: "Service", value: 86 },
    { label: "Vendite", value: 74 },
    { label: "Amministrazione", value: 58 },
    { label: "Qualita", value: 69 }
  ],
  "Anno precedente": [
    { label: "Laboratorio", value: 71 },
    { label: "Magazzino", value: 59 },
    { label: "Service", value: 80 },
    { label: "Vendite", value: 68 },
    { label: "Amministrazione", value: 55 },
    { label: "Qualita", value: 64 }
  ],
  "Mese in corso": [
    { label: "Laboratorio", value: 84 },
    { label: "Magazzino", value: 66 },
    { label: "Service", value: 92 },
    { label: "Vendite", value: 79 },
    { label: "Amministrazione", value: 60 },
    { label: "Qualita", value: 71 }
  ]
};

const INACTIVITY_MS = 60 * 1000;
const COUNTDOWN_SECONDS = 15;

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState("ANALISI");
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hts_dark") === "1");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState("Anno in corso");
  const [costPeriod, setCostPeriod] = useState("Anno in corso");
  const inactivityTimer = useRef(null);
  const countdownTimer = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  const navItems = useMemo(() => sections, []);

  const revenueChartData = useMemo(() => {
    const data = revenueData[revenuePeriod];
    return data.labels.map((label, index) => ({
      label,
      value: data.values[index]
    }));
  }, [revenuePeriod]);

  const costChartData = useMemo(() => {
    return costCenterData[costPeriod].map((item) => ({
      label: item.label,
      value: item.value
    }));
  }, [costPeriod]);

  const currencyFormatter = (value) => `EUR ${value}`;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("dark", darkMode);
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.classList.toggle("dark", darkMode);
    localStorage.setItem("hts_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("hts_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const userLabel = storedUser?.name || storedUser?.nome || storedUser?.firstName || "";
  const userSurname = storedUser?.surname || storedUser?.cognome || storedUser?.lastName || "";
  const fullName = `${userLabel} ${userSurname}`.trim();
  const avatarText = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "AD";

  const toggleSection = (title) => {
    setOpenSection((prev) => (prev === title ? "" : title));
  };

  const clearTimers = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  };

  const logoutNow = () => {
    clearTimers();
    localStorage.removeItem("hts_token");
    localStorage.removeItem("hts_user");
    navigate("/", { replace: true });
  };

  const startCountdown = () => {
    setShowTimeout(true);
    setCountdown(COUNTDOWN_SECONDS);
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          logoutNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const scheduleInactivity = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_MS);
  };

  const handleActivity = () => {
    if (showTimeout) {
      setShowTimeout(false);
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(COUNTDOWN_SECONDS);
    scheduleInactivity();
  };

  useEffect(() => {
    scheduleInactivity();
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      clearTimers();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)]">
      <div className="flex min-h-screen">
          <aside
            className={`relative hidden flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 lg:flex ${
              collapsed ? "w-[72px]" : "w-72"
            }`}
          >
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="absolute -right-4 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[10px] text-[var(--muted)] shadow-sm"
              aria-label={collapsed ? "Espandi sidebar" : "Collassa sidebar"}
            >
              <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 px-4 py-5">
              <div className="grid h-10 w-10 place-items-center rounded-md">
                <img src={logo} alt="HTS Med" className="h-6 w-6" />
              </div>
              <div className={collapsed ? "sr-only" : ""}>
                <div className="text-sm font-semibold">HTS Med</div>
                <div className="text-xs text-[var(--muted)]">Dashboard</div>
              </div>
            </div>

            <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-6">
              {navItems.map((section) => {
                const isOpen = openSection === section.title;
                return (
                  <div key={section.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      onMouseEnter={() => {
                        if (collapsed) setCollapsed(false);
                      }}
                      className={`flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-fg)] ${
                        collapsed ? "h-[46px] w-[46px] p-0" : "px-3 py-2"
                      }`}
                    >
                      <span className={`flex items-center gap-3 ${collapsed ? "w-full justify-center" : ""}`}>
                        <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-[var(--surface-strong)] text-[var(--page-fg)]">
                          <i className={`fa-solid ${section.icon} block text-[16px] leading-none`} aria-hidden="true" />
                        </span>
                        <span className={collapsed ? "sr-only" : ""}>{section.title}</span>
                      </span>
                      {!collapsed ? (
                        <span className={`text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          <i className="fa-solid fa-caret-down" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${isOpen && !collapsed ? "max-h-[520px]" : "max-h-0"}`}>
                      {!collapsed ? (
                        <div className="flex max-h-[480px] flex-col gap-1 overflow-y-auto pb-3 pl-6 pr-2">
                          {section.items.length ? (
                            section.items.map((item) => (
                              <button
                                key={item}
                                type="button"
                                className="rounded-md px-2 py-2 text-left text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                              >
                                {item}
                              </button>
                            ))
                          ) : (
                            <p className="px-2 py-2 text-xs text-[var(--muted)]">Nessuna sottosezione</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Panoramica generale</div>
                <h1 className="text-2xl font-semibold">Dashboard HTS Med</h1>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative hidden md:flex" ref={userMenuRef}>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--page-fg)] transition hover:bg-[var(--hover)]"
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    aria-expanded={showUserMenu}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-semibold">
                      {avatarText}
                    </span>
                    {fullName ? <span className="text-sm font-semibold">{fullName}</span> : null}
                    <i className="fa-solid fa-chevron-down text-[10px] text-[var(--muted)]" aria-hidden="true" />
                  </button>
                  {showUserMenu ? (
                    <div className="absolute right-0 top-12 z-20 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                        onClick={() => setDarkMode((prev) => !prev)}
                      >
                        <span>Tema</span>
                        <span className="text-xs text-[var(--muted)]">{darkMode ? "Dark" : "Light"}</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                        onClick={logoutNow}
                      >
                        <i className="fa-solid fa-right-from-bracket text-xs" aria-hidden="true" />
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="md:hidden">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                    aria-label="Menu"
                    onClick={() => setMobileOpen(true)}
                  >
                    <i className="fa-solid fa-bars" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 space-y-6 px-6 py-6">
              <section className="grid gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold">Attivita recenti</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { title: "Intervento aperto", detail: "RM 1.5T - Bologna - 09:14" },
                    { title: "Collaudo completato", detail: "TC 64 slice - Milano - 08:58" },
                    { title: "Spedizione partita", detail: "RX Digitale - Roma - 08:41" }
                  ].map((item) => (
                    <div key={item.title} className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Fatturato</p>
                      <h3 className="mt-2 text-lg font-semibold">Trend annuale</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] p-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:flex">
                        {periodOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setRevenuePeriod(option)}
                            className={`rounded-full px-3 py-1 transition ${
                              revenuePeriod === option ? "bg-[var(--surface-strong)] text-[var(--page-fg)]" : "hover:bg-[var(--hover)]"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <div className="sm:hidden">
                        <select
                          value={revenuePeriod}
                          onChange={(event) => setRevenuePeriod(event.target.value)}
                          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--page-fg)]"
                        >
                          {periodOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-sm text-[var(--muted)]">EUR 1.482.900</div>
                    </div>
                  </div>
                  <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip
                          cursor={{ stroke: "#14b8a6", strokeDasharray: "4 6", strokeOpacity: 0.3 }}
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--page-fg)"
                          }}
                          labelStyle={{ color: "var(--muted)", fontSize: "12px" }}
                          formatter={(value) => currencyFormatter(value)}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#14b8a6"
                          strokeWidth={4}
                          dot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                          activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 3 }}
                          fill="url(#revenueFill)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Centri di costo</p>
                      <h3 className="mt-2 text-lg font-semibold">Radar prestazioni</h3>
                    </div>
                    <div className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] p-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:flex">
                      {periodOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setCostPeriod(option)}
                          className={`rounded-full px-3 py-1 transition ${
                            costPeriod === option ? "bg-[var(--surface-strong)] text-[var(--page-fg)]" : "hover:bg-[var(--hover)]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="sm:hidden">
                      <select
                        value={costPeriod}
                        onChange={(event) => setCostPeriod(event.target.value)}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--page-fg)]"
                      >
                        {periodOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-6">
                    <div className="h-72 w-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={costChartData}>
                          <PolarGrid stroke="currentColor" strokeOpacity={0.2} />
                          <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                          <PolarRadiusAxis tick={{ fill: "var(--muted)", fontSize: 10 }} angle={30} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              color: "var(--page-fg)"
                            }}
                            labelStyle={{ color: "var(--muted)", fontSize: "12px" }}
                            formatter={(value) => `${value}%`}
                          />
                          <Radar dataKey="value" stroke="#14b8a6" fill="rgba(20,184,166,0.35)" dot strokeWidth={3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3 text-sm">
                      {costCenterData[costPeriod].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-[var(--page-fg)]">{item.label}</span>
                          <span className="text-[var(--muted)]">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </main>

            <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                <span>Stato sistema: operativo</span>
                <span>Versione 0.1.0</span>
                <span>Supporto: help@htsmed.com</span>
              </div>
            </footer>
          </div>
        </div>

      {showTimeout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold">Stai per essere disconnesso per inattivita</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Disconnessione tra {countdown}s.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--page-fg)]"
                onClick={handleActivity}
              >
                Resta connesso
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={logoutNow}
              >
                Esci ora
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Chiudi menu"
          />
          <div className="relative ml-auto h-full w-80 bg-[var(--surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div className="text-sm font-semibold">Menu</div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)]"
                onClick={() => setMobileOpen(false)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                onClick={() => setDarkMode((prev) => !prev)}
              >
                <i className={`fa-solid ${darkMode ? "fa-sun" : "fa-moon"}`} aria-hidden="true" />
                <span>{darkMode ? "Light" : "Dark"}</span>
              </button>
              {navItems.map((section) => {
                const isOpen = openSection === section.title;
                return (
                  <div key={section.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-fg)]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-[var(--surface-strong)] text-[var(--page-fg)]">
                          <i className={`fa-solid ${section.icon} block text-[16px] leading-none`} aria-hidden="true" />
                        </span>
                        <span>{section.title}</span>
                      </span>
                      <span className={`text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <i className="fa-solid fa-caret-down" aria-hidden="true" />
                      </span>
                    </button>
                    <div className={`overflow-hidden transition-all ${isOpen ? "max-h-[520px]" : "max-h-0"}`}>
                      <div className="flex flex-col gap-1 pb-3 pl-6 pr-2">
                        {section.items.length ? (
                          section.items.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="rounded-md px-2 py-2 text-left text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                            >
                              {item}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-2 text-xs text-[var(--muted)]">Nessuna sottosezione</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
