import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const compressImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.max(Math.floor(img.width * scale), 1);
        const height = Math.max(Math.floor(img.height * scale), 1);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non disponibile"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("Impossibile leggere immagine"));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });

export default function MobileScanPage() {
  const { sessionId } = useParams();
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [seriale, setSeriale] = useState("");
  const [sending, setSending] = useState(false);

  const hasResult = useMemo(() => status === "ready" && seriale, [status, seriale]);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/warehouse/scan-sessions/${encodeURIComponent(sessionId || "")}`);
        if (!res.ok) throw new Error("Sessione non valida o scaduta");
        const payload = await res.json();
        if (!isMounted) return;
        if (payload?.status === "ready") {
          setSeriale(String(payload.seriale || ""));
          setStatus("ready");
        } else {
          setStatus("waiting");
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setError(err.message || "Errore verifica sessione");
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || sending || !sessionId) return;
    setSending(true);
    setError("");
    try {
      const imageDataUrl = await compressImageToDataUrl(file);
      const res = await fetch(`${API_BASE}/api/warehouse/scan-sessions/${encodeURIComponent(sessionId)}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.dettaglio || payload?.errore || "Errore scansione");
      setSeriale(String(payload?.seriale || ""));
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Errore scansione");
    } finally {
      setSending(false);
      event.target.value = "";
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#080b12] px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scanner seriale</p>
        <h1 className="mt-2 text-xl font-semibold">Scansiona dal telefono</h1>
        <p className="mt-2 text-sm text-slate-300">
          Scatta una foto del seriale. Il risultato verrà inviato automaticamente al PC.
        </p>

        <label className="mt-4 block">
          <span className="sr-only">Carica immagine seriale</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={sending || status === "checking"}
            onChange={handleFile}
            className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        {sending ? <p className="mt-3 text-sm text-emerald-300">Analisi in corso...</p> : null}
        {hasResult ? (
          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Seriale estratto</p>
            <p className="mt-1 break-all text-base font-semibold text-emerald-100">{seriale}</p>
            <p className="mt-1 text-xs text-emerald-200/90">Puoi tornare sul PC.</p>
          </div>
        ) : null}
        {status === "error" && error ? (
          <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
