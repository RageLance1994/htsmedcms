const highlights = [
  {
    title: "Workflow tecnico unico",
    body: "Riparazione, collaudo, ricambi, logistica e amministrazione nello stesso sistema."
  },
  {
    title: "Tracciabilita completa",
    body: "Ogni intervento e passaggio e registrato con timestamp, firma e responsabile."
  },
  {
    title: "Spedizioni sotto controllo",
    body: "Gestisci rigenerazione, magazzino e distribuzione con SLA chiari."
  }
];

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AccessPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.errore || "Credenziali non valide.");
      }

      const result = await response.json();
      localStorage.setItem("hts_token", result.token);
      localStorage.setItem("hts_user", JSON.stringify(result.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="glass w-full max-w-xl rounded-3xl p-8 shadow-glow">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Portale accesso</p>
            <h2 className="text-3xl font-semibold text-slate-900">Accedi al tuo workspace</h2>
            <p className="text-sm text-slate-500">Usa le tue credenziali sicure per continuare.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500" htmlFor="email">
                Indirizzo email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="tecnico@htsmed.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Inserisci la password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Resta connesso
              </label>
              <button type="button" className="font-semibold text-slate-700">
                Reimposta password
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Accesso in corso..." : "Continua"}
            </button>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </form>

          <div className="flex flex-col gap-3 text-sm text-slate-500">
            <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Accesso sicuro
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
                    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
                    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
                    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
                  </svg>
                </span>
                SSO con Entra
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.5-5.1 3.5-3.1 0-5.6-2.6-5.6-5.8S8.9 5.7 12 5.7c1.8 0 3 .8 3.6 1.4l2.4-2.3C16.5 3.4 14.5 2.4 12 2.4 6.9 2.4 2.8 6.6 2.8 11.6S6.9 20.8 12 20.8c6.9 0 8.6-4.9 8.6-7.5 0-.5-.1-.9-.1-1.2H12z"
                    />
                  </svg>
                </span>
                SSO con Google Identity
              </button>
            </div>
            <p className="text-center text-xs uppercase tracking-[0.3em] text-slate-400">
              Nuova sede? Richiedi attivazione
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
