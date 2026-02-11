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
import AppLayout from "../components/AppLayout.jsx";

const quickStats = [
  { label: "Fatture Scadute", value: "9" },
  { label: "Offerte in attesa", value: "14" },
  { label: "Fatture in scadenza", value: "17" },
  { label: "Contratti in scadenza", value: "5" }
];

const periodOptions = ["Sempre", "Anno in corso", "Anno precedente", "Mese in corso"];

const revenueData = {
  Sempre: {
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
  Sempre: [
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
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [revenuePeriod, setRevenuePeriod] = useState("Anno in corso");
  const [costPeriod, setCostPeriod] = useState("Anno in corso");
  const inactivityTimer = useRef(null);
  const countdownTimer = useRef(null);
  const navigate = useNavigate();

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
    <>
      <AppLayout
        contextLabel="Panoramica generale"
        pageTitle="Dashboard HTS Med"
        brandContext="Dashboard"
        defaultOpenSection="ANALISI"
        mainClassName="flex-1 space-y-6 px-6 py-6"
        logoutAction={logoutNow}
      >
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
      </AppLayout>

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
    </>
  );
}
