import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "";

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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureInputRef = useRef(null);
  const galleryInputRef = useRef(null);

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

  useEffect(() => {
    let cancelled = false;
    const canUseLiveCamera =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!canUseLiveCamera || hasResult || status === "error") {
      stopStream();
      if (!canUseLiveCamera) {
        setCameraReady(false);
        setCameraError("Anteprima camera non disponibile su questa connessione. Usa i pulsanti sotto.");
      }
      return () => stopStream();
    }

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // ignore autoplay errors
          }
        }
        setCameraReady(true);
        setCameraError("");
      } catch {
        setCameraReady(false);
        setCameraError("Impossibile aprire la fotocamera in anteprima.");
      }
    };

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [hasResult, status]);

  const submitImageDataUrl = async (imageDataUrl) => {
    if (!sessionId) return;
    const res = await fetch(`${API_BASE}/api/warehouse/scan-sessions/${encodeURIComponent(sessionId)}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.dettaglio || payload?.errore || "Errore scansione");
    setSeriale(String(payload?.seriale || ""));
    setStatus("ready");
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || sending || !sessionId) return;
    setSending(true);
    setError("");
    try {
      const imageDataUrl = await compressImageToDataUrl(file);
      await submitImageDataUrl(imageDataUrl);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Errore scansione");
    } finally {
      setSending(false);
      event.target.value = "";
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current || sending || !sessionId) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    setSending(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non disponibile");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.72);
      await submitImageDataUrl(imageDataUrl);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Errore scansione");
    } finally {
      setSending(false);
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

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-700 bg-black">
          <div className="relative aspect-[3/4] w-full">
            {cameraReady ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-slate-300">
                {cameraError || "Anteprima fotocamera non disponibile."}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
              <div className="absolute left-0 top-1/3 h-px w-full bg-white/30" />
              <div className="absolute left-0 top-2/3 h-px w-full bg-white/30" />
            </div>
          </div>
          <div className="border-t border-slate-700 p-3">
            <button
              type="button"
              onClick={cameraReady ? handleCaptureFrame : () => captureInputRef.current?.click()}
              disabled={sending || status === "checking"}
              className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cameraReady ? "Scatta foto" : "Apri fotocamera"}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={sending || status === "checking"}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
          >
            Carica dalla libreria
          </button>
        </div>

        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

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
