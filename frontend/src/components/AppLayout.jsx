import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";

export const APP_SECTIONS = [
  { title: "ANALISI", icon: "fa-chart-pie", items: ["Generale"] },
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

const APP_NAV_ROUTES = {
  Giacenze: "/warehouse/giacenze"
};

export default function AppLayout({
  contextLabel,
  pageTitle,
  brandContext = "Dashboard",
  defaultOpenSection = "ANALISI",
  mainClassName = "flex-1 px-6 py-6",
  fullscreen = false,
  supportAction = null,
  profileAction = null,
  infoAction = null,
  logoutAction = null,
  onNavItem = null,
  children
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState(defaultOpenSection);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hts_dark") === "1");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    setOpenSection(defaultOpenSection);
  }, [defaultOpenSection]);

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
  const userDisplay = fullName || "Admin";

  const toggleSection = (title) => {
    setOpenSection((prev) => (prev === title ? "" : title));
  };

  const handleSupport = () => {
    if (supportAction) {
      supportAction();
      return;
    }
    window.location.href = "mailto:help@htsmed.com";
  };

  const handleNavItem = (item) => {
    if (item === "Generale") {
      navigate("/dashboard");
      setMobileOpen(false);
      return;
    }
    if (onNavItem) {
      onNavItem(item);
    } else {
      const route = APP_NAV_ROUTES[item];
      if (route) navigate(route);
    }
    setMobileOpen(false);
  };

  return (
    <div className={`${fullscreen ? "h-screen overflow-hidden" : "min-h-screen"} bg-[var(--page-bg)] text-[var(--page-fg)]`}>
      <div className={`flex ${fullscreen ? "h-screen min-h-0 overflow-x-hidden" : "min-h-screen"}`}>
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
              <div className="text-xs text-[var(--muted)]">{brandContext}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-6">
            {APP_SECTIONS.map((section) => {
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
                              onClick={() => handleNavItem(item)}
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

        <div className="flex min-h-0 flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{contextLabel}</div>
              <h1 className="text-2xl font-semibold">{pageTitle}</h1>
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
                  <span className="text-sm font-semibold">{userDisplay}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] text-[var(--muted)]" aria-hidden="true" />
                </button>
                {showUserMenu ? (
                  <div className="absolute right-0 top-12 z-20 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                      onClick={() => setDarkMode((prev) => !prev)}
                    >
                      <span className="flex items-center gap-2">
                        <i className={`fa-solid ${darkMode ? "fa-moon" : "fa-sun"} text-xs`} aria-hidden="true" />
                        Tema
                      </span>
                      <span className="text-xs text-[var(--muted)]">{darkMode ? "Scuro" : "Chiaro"}</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
                      onClick={handleSupport}
                    >
                      <i className="fa-solid fa-life-ring text-xs" aria-hidden="true" />
                      Supporto
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={profileAction || undefined}
                      disabled={!profileAction}
                    >
                      <i className="fa-solid fa-user text-xs" aria-hidden="true" />
                      Profilo
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={infoAction || undefined}
                      disabled={!infoAction}
                    >
                      <i className="fa-solid fa-circle-info text-xs" aria-hidden="true" />
                      Informazioni
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--page-fg)] hover:bg-rose-600/20 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={logoutAction || undefined}
                      disabled={!logoutAction}
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

          <main className={mainClassName}>{children}</main>

          <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              <span>Stato sistema: operativo</span>
              <span>Versione 0.1.0</span>
              <span>Supporto: help@htsmed.com</span>
            </div>
          </footer>
        </div>
      </div>

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
              {APP_SECTIONS.map((section) => {
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
                              onClick={() => handleNavItem(item)}
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
