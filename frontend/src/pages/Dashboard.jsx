import { useMemo, useState } from "react";
import logo from "../assets/logo.svg";

const sections = [
  {
    title: "ANALISI",
    icon: "fa-chart-pie",
    items: []
  },
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
  {
    title: "GESTIONE",
    icon: "fa-sliders",
    items: []
  }
];

const quickStats = [
  { label: "Fatturato Mensile", value: "EUR 128.400" },
  { label: "Fatturato Annuale", value: "EUR 1.482.900" },
  { label: "Fatture in scadenza", value: "17" },
  { label: "Contratti in scadenza", value: "5" }
];

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState("ANALISI");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(() => sections, []);

  const toggleSection = (title) => {
    setOpenSection((prev) => (prev === title ? "" : title));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`relative hidden flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex ${
            collapsed ? "w-[72px]" : "w-72"
          }`}
        >
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="absolute -right-4 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-600 shadow-sm"
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
              <div className="text-xs text-slate-500">Dashboard</div>
            </div>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-6">
            {navItems.map((section) => {
              const isOpen = openSection === section.title;
              return (
                <div key={section.title} className="rounded-lg border border-slate-400 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    onMouseEnter={() => {
                      if (collapsed) setCollapsed(false);
                    }}
                    className={`flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 ${
                      collapsed ? "h-[46px] w-[46px] p-0" : "px-3 py-2"
                    }`}
                  >
                    <span className={`flex items-center gap-3 ${collapsed ? "w-full justify-center" : ""}`}>
                      <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-white text-slate-700">
                        <i className={`fa-solid ${section.icon} block text-[16px] leading-none`} aria-hidden="true" />
                      </span>
                      <span className={collapsed ? "sr-only" : ""}>{section.title}</span>
                    </span>
                    {!collapsed ? (
                      <span className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <i className="fa-solid fa-caret-down" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isOpen && !collapsed ? "max-h-[520px]" : "max-h-0"
                    }`}
                  >
                    {!collapsed ? (
                      <div className="flex max-h-[480px] flex-col gap-1 overflow-y-auto pb-3 pl-6 pr-2">
                        {section.items.length ? (
                          section.items.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            >
                              {item}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-2 text-xs text-slate-500">Nessuna sottosezione</p>
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
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Panoramica generale</div>
              <h1 className="text-2xl font-semibold">Dashboard HTS Med</h1>
            </div>
            <div className="md:hidden">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"
                aria-label="Menu"
                onClick={() => setMobileOpen(true)}
              >
                <i className="fa-solid fa-bars" aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="flex-1 space-y-6 px-6 py-6">
            <section className="grid gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Attivita recenti</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { title: "Intervento aperto", detail: "RM 1.5T � Bologna � 09:14" },
                  { title: "Collaudo completato", detail: "TC 64 slice � Milano � 08:58" },
                  { title: "Spedizione partita", detail: "RX Digitale � Roma � 08:41" }
                ].map((item) => (
                  <div key={item.title} className="rounded-md border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
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
          <div className="relative ml-auto h-full w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="text-sm font-semibold">Menu</div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600"
                onClick={() => setMobileOpen(false)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              {navItems.map((section) => {
                const isOpen = openSection === section.title;
                return (
                  <div key={section.title} className="rounded-lg border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-white text-slate-700">
                          <i className={`fa-solid ${section.icon} block text-[16px] leading-none`} aria-hidden="true" />
                        </span>
                        <span>{section.title}</span>
                      </span>
                      <span className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>
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
                              className="rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            >
                              {item}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-2 text-xs text-slate-500">Nessuna sottosezione</p>
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
