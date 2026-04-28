import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import warehouseRouter from "./routes/warehouse.js";
import warehouseChecklistRouter from "./routes/warehouseChecklist.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production" || !!process.env.K_SERVICE;
const corsOrigins =
  process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173";
const allowedOrigins = corsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isPrivateNetworkOrigin = (origin) => {
  try {
    const url = new URL(origin);
    const host = String(url.hostname || "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isPrivateNetworkOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origine non consentita"));
    },
    credentials: true
  })
);
app.use(
  compression({
    level: 6,
    threshold: 1024
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api", (req, res) => {
  res.json({
    nome: "HTS Med CMS API",
    stato: "online",
    data: new Date().toISOString()
  });
});

app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/warehouse", warehouseChecklistRouter);

if (isProduction) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ errore: "Rotta non trovata" });
    }
    return res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({
    errore: "Rotta non trovata"
  });
});

export default app;
