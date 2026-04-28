import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../templates");

const WAREHOUSE_DB_NAME =
  String(process.env.WAREHOUSE_DB_NAME || "").trim() ||
  mongoose.connection?.db?.databaseName ||
  "htsmed";
const getWarehouseDb = () => mongoose.connection.useDb(WAREHOUSE_DB_NAME, { useCache: true });

const normalizeWarehouseCode = (value) => String(value || "").trim();
const normalizeSerial = (value) => String(value || "").trim();
const parseBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["1", "true", "si", "sì", "yes", "y"].includes(v)) return true;
    if (["0", "false", "no", "n"].includes(v)) return false;
  }
  return fallback;
};
const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeMapName = (value) => String(value || "").trim();
const normalizeMapBlock = (block, index = 0) => {
  const idRaw = String(block?.id || "").trim();
  const labelRaw = String(block?.label || "").trim();
  const colorRaw = String(block?.color || "").trim();
  const kindRaw = String(block?.kind || "").trim().toLowerCase();
  const shapeRaw = String(block?.shape || "").trim().toLowerCase();
  const kind = ["shelf", "prop", "shape"].includes(kindRaw) ? kindRaw : "shelf";
  const shape = ["rect", "circle"].includes(shapeRaw) ? shapeRaw : "rect";
  const rows = kind === "shelf" ? clamp(Math.floor(toFiniteNumber(block?.rows, 1)), 1, 200) : 1;
  const cols = kind === "shelf" ? clamp(Math.floor(toFiniteNumber(block?.cols, 1)), 1, 200) : 1;
  const rotationRaw = Math.round(toFiniteNumber(block?.rotation, 0) / 90) * 90;
  const defaultLabel = kind === "prop" ? "Prop" : kind === "shape" ? "Forma" : `B${index + 1}`;
  const defaultColor = kind === "prop" ? "#38bdf8" : kind === "shape" ? "#f59e0b" : "#4ade80";
  return {
    id: idRaw || `B${index + 1}`,
    kind,
    shape,
    label: labelRaw || idRaw || defaultLabel,
    x: clamp(toFiniteNumber(block?.x, 0), -100000, 100000),
    y: clamp(toFiniteNumber(block?.y, 0), -100000, 100000),
    w: clamp(toFiniteNumber(block?.w, 120), 24, 4000),
    h: clamp(toFiniteNumber(block?.h, 48), 24, 4000),
    rotation: ((rotationRaw % 360) + 360) % 360,
    color: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorRaw) ? colorRaw : defaultColor,
    rows,
    cols
  };
};
const normalizeMapLayout = (layout) => {
  const blocks = Array.isArray(layout?.blocks) ? layout.blocks.map((item, idx) => normalizeMapBlock(item, idx)) : [];
  return {
    width: clamp(toFiniteNumber(layout?.width, 1400), 320, 12000),
    height: clamp(toFiniteNumber(layout?.height, 900), 240, 12000),
    zoom: clamp(toFiniteNumber(layout?.zoom, 1), 0.2, 3),
    blocks
  };
};
const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const pickDdtTemplateBase = () => {
  try {
    const files = fs
      .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(dotx?|docx?|rtf)$/i.test(name));
    const candidates = files.map((name) => {
      const lower = name.toLowerCase();
      let nameScore = 0;
      if (/(^|[^a-z])ddt([^a-z]|$)/i.test(lower) || /documento.*trasporto|trasporto.*documento/i.test(lower)) {
        nameScore += 100;
      }
      if (/(bolla|trasporto|vettore|spedizione)/i.test(lower)) nameScore += 35;
      if (/(template|modello)/i.test(lower)) nameScore += 8;
      if (lower.endsWith(".dotx") || lower.endsWith(".dot")) nameScore += 8;
      if (lower.endsWith(".docx")) nameScore += 6;
      if (lower.endsWith(".doc")) nameScore += 4;
      if (/(letter|contltr|elegltr|profltr|normale|intestata|osteopenia|femore|lombo|densitometria|report)/i.test(lower)) {
        nameScore -= 120;
      }
      if (/^winword/i.test(lower)) nameScore -= 120;

      const preview = buildTemplatePreviewPayload(name);
      const contentScore = Number(preview?.signalScore || 0) * 30;
      const likelyDdt = Boolean(preview?.likelyDdt);
      const score = nameScore + contentScore;
      return { name, score, likelyDdt };
    });
    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "it"));
    const selected = candidates.find((row) => row.likelyDdt)?.name || null;
    return {
      selected,
      candidates
    };
  } catch {
    return { selected: null, candidates: [] };
  }
};

const safeTemplateName = (name) => {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const base = path.basename(raw);
  if (base !== raw) return "";
  if (base.includes("..")) return "";
  return base;
};

const extractTextFromRtf = (content) => {
  const raw = String(content || "");
  return raw
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractPrintableTextFromBinary = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return "";
  const latin = buffer.toString("latin1");
  const chunks = latin.match(/[ -~]{4,}/g) || [];
  return chunks.join(" ").replace(/\s+/g, " ").trim();
};

const findZipEocdOffset = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 22) return -1;
  const min = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
};

const parseZipCentralDirectory = (buffer) => {
  const eocdOffset = findZipEocdOffset(buffer);
  if (eocdOffset < 0) return [];
  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const end = centralDirOffset + centralDirSize;
  if (centralDirOffset < 0 || end > buffer.length) return [];
  const entries = [];
  let cursor = centralDirOffset;
  while (cursor + 46 <= end && cursor + 46 <= buffer.length) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) break;
    const isUtf8 = (flags & 0x0800) !== 0;
    const fileName = buffer.toString(isUtf8 ? "utf8" : "latin1", fileNameStart, fileNameEnd);
    entries.push({
      fileName,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });
    cursor = fileNameEnd + extraLength + commentLength;
  }
  return entries;
};

const extractZipEntryBuffer = (zipBuffer, entry) => {
  const offset = Number(entry?.localHeaderOffset || 0);
  if (!Number.isFinite(offset) || offset < 0 || offset + 30 > zipBuffer.length) return Buffer.alloc(0);
  if (zipBuffer.readUInt32LE(offset) !== 0x04034b50) return Buffer.alloc(0);
  const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
  const extraLength = zipBuffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + Number(entry?.compressedSize || 0);
  if (dataStart < 0 || dataEnd > zipBuffer.length || dataEnd <= dataStart) return Buffer.alloc(0);
  const chunk = zipBuffer.subarray(dataStart, dataEnd);
  const method = Number(entry?.method || 0);
  if (method === 0) return chunk;
  if (method === 8) {
    try {
      return zlib.inflateRawSync(chunk);
    } catch {
      return Buffer.alloc(0);
    }
  }
  return Buffer.alloc(0);
};

const decodeXmlEntities = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const extractWordprocessingText = (xmlText) => {
  const xml = String(xmlText || "");
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  const lines = matches
    .map((m) => decodeXmlEntities(m?.[1] || ""))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .map((s) => s.replace(/[\u0000-\u001f\u007f]/g, " "))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s && !/<\/?w:[^>]+>/i.test(s) && !/w:rsid|w:rpr|w:ppr|bookmark(start|end)/i.test(s))
    .filter(Boolean);
  return lines;
};

const extractTextFromDotxDocx = (buffer) => {
  const entries = parseZipCentralDirectory(buffer);
  if (!entries.length) return [];
  const wanted = entries.filter((entry) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/i.test(String(entry.fileName || ""))
  );
  const lines = [];
  for (const entry of wanted) {
    const raw = extractZipEntryBuffer(buffer, entry);
    if (!raw.length) continue;
    const xml = raw.toString("utf8");
    lines.push(...extractWordprocessingText(xml));
    if (lines.length >= 300) break;
  }
  return lines;
};

const buildTemplatePreviewPayload = (templateName) => {
  const baseName = safeTemplateName(templateName);
  if (!baseName) return { ok: false, errore: "Template non valido" };

  const templatePath = path.join(TEMPLATES_DIR, baseName);
  if (!templatePath.startsWith(TEMPLATES_DIR)) {
    return { ok: false, errore: "Percorso template non valido" };
  }
  if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isFile()) {
    return { ok: false, errore: "Template non trovato" };
  }

  const ext = path.extname(baseName).toLowerCase();
  const raw = fs.readFileSync(templatePath);
  let lines = [];
  if (ext === ".dotx" || ext === ".docx") {
    lines = extractTextFromDotxDocx(raw).slice(0, 64);
  } else if (ext === ".rtf") {
    const text = extractTextFromRtf(raw.toString("utf8"));
    lines = text
      .split(/(?<=[.!?])\s+|\s{2,}/)
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .slice(0, 64);
  } else {
    const text = extractPrintableTextFromBinary(raw);
    lines = text
      .split(/(?<=[.!?])\s+|\s{2,}/)
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .slice(0, 64);
  }

  const lowered = lines.map((line) => line.toLowerCase());
  const ddtSignals = ["documento di trasporto", "ddt", "causale", "destinazione", "vettore", "colli", "porto"];
  const score = ddtSignals.reduce(
    (acc, token) => acc + (lowered.some((line) => line.includes(token)) ? 1 : 0),
    0
  );
  const likelyDdt = score >= 2;

  return {
    ok: true,
    template: baseName,
    ext,
    title: lines[0] || baseName,
    lines,
    signalScore: score,
    likelyDdt
  };
};

const SCAN_SESSION_TTL_MS = 10 * 60 * 1000;
const scanSessions = new Map();

const cleanupExpiredScanSessions = () => {
  const now = Date.now();
  for (const [id, session] of scanSessions.entries()) {
    if (!session || session.expiresAt <= now) {
      scanSessions.delete(id);
    }
  }
};

const normalizeOrigin = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
};

const isLoopbackHost = (host) => {
  const value = String(host || "").trim().toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1" || value === "[::1]";
};

const isPrivateIpv4 = (ip) => {
  const parts = String(ip || "")
    .split(".")
    .map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
};

const getPreferredLanIpv4 = () => {
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    if (!Array.isArray(addresses)) continue;
    for (const addr of addresses) {
      if (!addr || addr.family !== "IPv4" || addr.internal) continue;
      if (isPrivateIpv4(addr.address)) {
        return addr.address;
      }
    }
  }
  return "";
};

const withLanHostWhenLoopback = (originLike) => {
  const normalized = normalizeOrigin(originLike);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    if (!isLoopbackHost(url.hostname)) return normalized;
    const lanIp = getPreferredLanIpv4();
    if (!lanIp) return normalized;
    url.hostname = lanIp;
    return normalizeOrigin(url.toString());
  } catch {
    return normalized;
  }
};

const getScanBaseUrl = (req) => {
  const envBase = withLanHostWhenLoopback(process.env.SCAN_MOBILE_BASE_URL);
  if (envBase) return envBase;
  const originHeader = withLanHostWhenLoopback(req.headers.origin);
  if (originHeader) return originHeader;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "";
  return withLanHostWhenLoopback(`${proto}://${host}`);
};

const readResponseOutputText = (payload) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return "";
};

const normalizeExtractedSerial = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

const extractSerialFromImageWithOpenAI = async (imageDataUrl) => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
  }
  const model = String(process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini");
  const prompt =
    "Estrai il codice seriale principale dall'immagine. Rispondi SOLO JSON valido con la chiave seriale. Se non trovi alcun seriale usa stringa vuota.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageDataUrl }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "seriale_estratto",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              seriale: { type: "string" }
            },
            required: ["seriale"]
          },
          strict: true
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      payload?.error?.message || payload?.message || `Errore OpenAI (${response.status})`;
    throw new Error(msg);
  }

  let seriale = "";
  const outputText = readResponseOutputText(payload);
  if (outputText) {
    try {
      const parsed = JSON.parse(outputText);
      seriale = normalizeExtractedSerial(parsed?.seriale);
    } catch {
      seriale = normalizeExtractedSerial(outputText);
    }
  }
  if (!seriale) {
    throw new Error("Seriale non rilevato dall'immagine");
  }
  return seriale;
};

let ensureIndexesPromise = null;

const sameIndexKey = (a = {}, b = {}) => {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([k, v], idx) => {
    const [bk, bv] = bEntries[idx] || [];
    return bk === k && bv === v;
  });
};

const ensureCollectionIndexes = async (db, collectionName, indexSpecs) => {
  const collection = db.collection(collectionName);
  const existing = await collection.indexes();
  for (const spec of indexSpecs) {
    const alreadyExists = existing.some((idx) => sameIndexKey(idx.key, spec.key));
    if (!alreadyExists) {
      await collection.createIndex(spec.key, spec.options || {});
    }
  }
};

const buildWarehouseCacheRowsPipeline = (codes) => [
  { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
  { $match: { codiceTrim: { $in: codes } } },
  {
    $lookup: {
      from: "Movimenti di magazzino",
      let: { code: "$codiceTrim" },
      pipeline: [
        { $match: { $expr: { $eq: [{ $trim: { input: "$Cod_Articolo" } }, "$$code"] } } },
        {
          $lookup: {
            from: "Causali di magazzino",
            localField: "Cod_Causale",
            foreignField: "cod",
            as: "causale"
          }
        },
        { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            qty: "$QT movimentata",
            azFisica: "$causale.Azione su Giacenza Fisica",
            azFiscale: "$causale.Azione su Giacenza Fiscale"
          }
        },
        {
          $group: {
            _id: null,
            giacenzaFisica: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFisica", 0] }] }
            },
            giacenzaFiscale: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFiscale", 0] }] }
            }
          }
        }
      ],
      as: "movimentiAgg"
    }
  },
  {
    $addFields: {
      giacenzaFisica: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFisica", 0] }, 0] },
      giacenzaFiscale: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFiscale", 0] }, 0] }
    }
  },
  {
    $project: {
      _id: 0,
      codiceArticolo: "$codiceTrim",
      descrizione: "$Descrizione",
      unitaMisura: {
        $ifNull: [
          "$UnitÃƒÂ  di Misura",
          { $ifNull: ["$UnitÃ  di Misura", "$Unità di Misura"] }
        ]
      },
      giacenzaMinima: "$Giacenza Minina",
      alertGiacenza: "$Alert Giacenza",
      giacenzaFisica: 1,
      giacenzaFiscale: 1,
      obsoleto: "$Obsoleto"
    }
  }
];

const refreshWarehouseCacheByCodes = async (db, codes) => {
  const uniqueCodes = Array.from(new Set(codes.map(normalizeWarehouseCode).filter(Boolean)));
  if (uniqueCodes.length === 0) return;

  const rows = await db
    .collection("Codici_di_magazzino")
    .aggregate(buildWarehouseCacheRowsPipeline(uniqueCodes), { allowDiskUse: true })
    .toArray();

  if (rows.length === 0) return;

  const operations = rows.flatMap((row) => [
    {
      deleteMany: {
        filter: { codiceArticolo: row.codiceArticolo }
      }
    },
    {
      insertOne: {
        document: row
      }
    }
  ]);

  if (operations.length > 0) {
    await db.collection("warehouse_giacenze").bulkWrite(operations, { ordered: true });
  }
};

const getActiveSerialSet = async (db, pairs) => {
  const keys = pairs
    .map((pair) => ({
      codice: normalizeWarehouseCode(pair?.codiceArticolo),
      seriale: normalizeSerial(pair?.seriale)
    }))
    .filter((pair) => pair.codice && pair.seriale);
  if (keys.length === 0) return new Set();

  const codes = Array.from(new Set(keys.map((k) => k.codice)));
  const serials = Array.from(new Set(keys.map((k) => k.seriale)));

  const rows = await db
    .collection("Allocazione Magazzino")
    .aggregate([
      { $match: { cod_articolo: { $in: codes }, Seriale: { $in: serials } } },
      {
        $lookup: {
          from: "Movimenti di magazzino",
          localField: "cod_movimento",
          foreignField: "cod",
          as: "mov"
        }
      },
      { $unwind: { path: "$mov", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Causali di magazzino",
          localField: "mov.Cod_Causale",
          foreignField: "cod",
          as: "causale"
        }
      },
      { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          codice: "$cod_articolo",
          seriale: "$Seriale",
          azioneFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] },
          dataMovimento: "$mov.Data",
          codMov: "$mov.cod"
        }
      },
      { $sort: { codice: 1, seriale: 1, dataMovimento: -1, codMov: -1 } },
      {
        $group: {
          _id: { codice: "$codice", seriale: "$seriale" },
          azioneFisica: { $first: "$azioneFisica" }
        }
      },
      { $match: { azioneFisica: { $gt: 0 } } }
    ])
    .toArray();

  return new Set(rows.map((r) => `${r?._id?.codice}::${r?._id?.seriale}`));
};

const getStockByCodes = async (db, codes) => {
  const uniqueCodes = Array.from(new Set((codes || []).map(normalizeWarehouseCode).filter(Boolean)));
  if (uniqueCodes.length === 0) return new Map();
  const rows = await db
    .collection("warehouse_giacenze")
    .find({ codiceArticolo: { $in: uniqueCodes } }, { projection: { _id: 0, codiceArticolo: 1, giacenzaFisica: 1, giacenzaFiscale: 1 } })
    .toArray();
  return new Map(
    rows.map((row) => [
      normalizeWarehouseCode(row.codiceArticolo),
      { fisica: Number(row.giacenzaFisica || 0), fiscale: Number(row.giacenzaFiscale || 0) }
    ])
  );
};

const ensureIndexes = async () => {
  if (ensureIndexesPromise) return ensureIndexesPromise;
  const db = getWarehouseDb();
  ensureIndexesPromise = Promise.all([
    ensureCollectionIndexes(db, "warehouse_giacenze", [
      { key: { codiceArticolo: 1 } },
      { key: { descrizione: 1 } },
      { key: { giacenzaFisica: 1 } },
      { key: { giacenzaMinima: 1 } },
      { key: { alertGiacenza: 1 } }
    ]),
    ensureCollectionIndexes(db, "Codici_di_magazzino", [
      { key: { "Codice Articolo": 1 } },
      { key: { Descrizione: 1 } }
    ]),
    ensureCollectionIndexes(db, "Cli_For", [
      { key: { Tipo: 1, Nominativo: 1 } },
      { key: { Nominativo: 1 } },
      { key: { PIVA: 1 } }
    ]),
    ensureCollectionIndexes(db, "Causali di magazzino", [
      { key: { Nascondi: 1 } },
      { key: { "Azione su Giacenza Fisica": 1 } }
    ]),
    ensureCollectionIndexes(db, "Movimenti di magazzino", [
      { key: { Cod_Articolo: 1 } },
      { key: { Cod_Causale: 1 } },
      { key: { Data: -1 } }
    ]),
    ensureCollectionIndexes(db, "Allocazione Magazzino", [
      { key: { cod_movimento: 1 } },
      { key: { cod_articolo: 1 } },
      { key: { cod_articolo: 1, Seriale: 1 } }
    ]),
    ensureCollectionIndexes(db, "warehouse_maps", [
      { key: { name: 1 }, options: { unique: true } },
      { key: { updatedAt: -1 } }
    ])
  ]).catch((error) => {
    ensureIndexesPromise = null;
    throw error;
  });
  return ensureIndexesPromise;
};

const ensureIndexesInBackground = () => {
  ensureIndexes().catch((error) => {
    console.warn("Indice magazzino non inizializzato:", error.message);
  });
};
ensureIndexesInBackground();

router.get("/giacenze", async (req, res) => {
  try {
    ensureIndexesInBackground();

    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 5000);
    const onlyAlerts = String(req.query.alerts || "0") === "1";
    const scope = String(req.query.scope || "complessivo").trim().toLowerCase();
    const referenceYearRaw = parseInt(req.query.year || "", 10);
    const referenceYear = Number.isFinite(referenceYearRaw) ? referenceYearRaw : new Date().getFullYear();
    const sortBy = String(req.query.sortBy || "codiceArticolo").trim();
    const sortDirRaw = String(req.query.sortDir || "asc").toLowerCase();
    const sortDir = sortDirRaw === "desc" ? -1 : 1;
    const skip = (page - 1) * limit;

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { descrizione: re },
        { codiceArticolo: re },
        { Descrizione: re },
        { "Codice Articolo": re }
      ];
    }

    const query = { ...match };
    if (onlyAlerts) {
      query.$expr = { $lt: ["$giacenzaFisica", { $ifNull: ["$giacenzaMinima", 0] }] };
    }

    const sortableFields = new Set([
      "codiceArticolo",
      "descrizione",
      "giacenzaFiscale",
      "giacenzaFisica",
      "unitaMisura",
      "giacenzaMinima",
      "alert"
    ]);
    const sortField = sortableFields.has(sortBy) ? sortBy : "codiceArticolo";
    const sort = sortField === "alert" ? { giacenzaFisica: sortDir, giacenzaMinima: sortDir } : { [sortField]: sortDir };

    if (scope === "annuale") {
      const escaped = search ? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
      const re = escaped ? new RegExp(escaped, "i") : null;
      const movimentiAgg = await db
        .collection("Movimenti di magazzino")
        .aggregate(
          [
            {
              $addFields: {
                __yearMov: {
                  $convert: {
                    input: { $substrBytes: [{ $toString: "$Data" }, 0, 4] },
                    to: "int",
                    onError: null,
                    onNull: null
                  }
                }
              }
            },
            { $match: { __yearMov: { $ne: null, $lte: referenceYear } } },
            {
              $lookup: {
                from: "Causali di magazzino",
                localField: "Cod_Causale",
                foreignField: "cod",
                as: "causale"
              }
            },
            { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                codiceArticolo: { $trim: { input: "$Cod_Articolo" } },
                qty: { $ifNull: ["$QT movimentata", 0] },
                azFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] },
                azFiscale: { $ifNull: ["$causale.Azione su Giacenza Fiscale", 0] }
              }
            },
            {
              $group: {
                _id: "$codiceArticolo",
                giacenzaFisica: {
                  $sum: { $multiply: ["$qty", "$azFisica"] }
                },
                giacenzaFiscale: {
                  $sum: { $multiply: ["$qty", "$azFiscale"] }
                }
              }
            }
          ],
          { allowDiskUse: true, maxTimeMS: 20000 }
        )
        .toArray();

      const codesFromMovements = Array.from(
        new Set(movimentiAgg.map((row) => normalizeWarehouseCode(row._id)).filter(Boolean))
      );

      const codiciRows =
        codesFromMovements.length > 0
          ? await db
              .collection("Codici_di_magazzino")
              .aggregate([
                { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
                { $match: { codiceTrim: { $in: codesFromMovements } } },
                { $project: { _id: 0, codiceTrim: 1, doc: "$$ROOT" } }
              ])
              .toArray()
          : [];

      const movimentiMap = new Map(
        movimentiAgg.map((row) => [normalizeWarehouseCode(row._id), { fisica: Number(row.giacenzaFisica || 0), fiscale: Number(row.giacenzaFiscale || 0) }])
      );
      const codiciMap = new Map(
        codiciRows.map((row) => [normalizeWarehouseCode(row.codiceTrim), row.doc || {}])
      );

      let rows = codesFromMovements.map((codiceArticolo) => {
        const agg = movimentiMap.get(codiceArticolo) || { fisica: 0, fiscale: 0 };
        const row = codiciMap.get(codiceArticolo) || {};
        return {
          codiceArticolo,
          descrizione: String(row.Descrizione || ""),
          unitaMisura:
            row["Unità di Misura"] ||
            row["UnitÃƒÂ  di Misura"] ||
            row["UnitÃ  di Misura"] ||
            row["UnitÃ  di misura"] ||
            "",
          giacenzaMinima: Number(row["Giacenza Minina"] || 0),
          alertGiacenza: row["Alert Giacenza"] === true,
          obsoleto: row.Obsoleto === true,
          giacenzaFisica: agg.fisica,
          giacenzaFiscale: agg.fiscale
        };
      });

      if (re) {
        rows = rows.filter((row) => re.test(row.codiceArticolo || "") || re.test(row.descrizione || ""));
      }

      if (onlyAlerts) {
        rows = rows.filter((row) => Number(row.giacenzaFisica || 0) < Number(row.giacenzaMinima || 0));
      }

      const compareValues = (a, b) => {
        if (typeof a === "number" || typeof b === "number") {
          return Number(a || 0) - Number(b || 0);
        }
        return String(a || "").localeCompare(String(b || ""), "it", { numeric: true, sensitivity: "base" });
      };

      rows.sort((a, b) => {
        if (sortField === "alert") {
          const first = compareValues(a.giacenzaFisica, b.giacenzaFisica);
          if (first !== 0) return first * sortDir;
          return compareValues(a.giacenzaMinima, b.giacenzaMinima) * sortDir;
        }
        return compareValues(a?.[sortField], b?.[sortField]) * sortDir;
      });

      const total = rows.length;
      const data = rows.slice(skip, skip + limit);
      return res.json({ page, limit, total, data, scope, year: referenceYear });
    }

    const [data, total] = await Promise.all([
      db
        .collection("warehouse_giacenze")
        .find(query, { projection: { _id: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("warehouse_giacenze").countDocuments(query)
    ]);

    res.json({ page, limit, total, data, scope: "complessivo", year: referenceYear });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento giacenze", dettaglio: error.message });
  }
});

router.get("/giacenze/seriali", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const codice = String(req.query.codice || "").trim();
    if (!codice) {
      return res.status(400).json({ errore: "Codice articolo mancante" });
    }

    const pipeline = [
      { $match: { cod_articolo: codice } },
      {
        $lookup: {
          from: "Movimenti di magazzino",
          localField: "cod_movimento",
          foreignField: "cod",
          as: "mov"
        }
      },
      { $unwind: { path: "$mov", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Causali di magazzino",
          localField: "mov.Cod_Causale",
          foreignField: "cod",
          as: "causale"
        }
      },
      { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          codiceArticolo: "$cod_articolo",
          seriale: { $trim: { input: { $ifNull: ["$Seriale", ""] } } },
          dataMovimento: "$mov.Data",
          azioneFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] }
        }
      },
      { $match: { seriale: { $ne: "" } } },
      { $sort: { seriale: 1, dataMovimento: -1 } },
      {
        $group: {
          _id: "$seriale",
          codiceArticolo: { $first: "$codiceArticolo" },
          dataMovimento: { $first: "$dataMovimento" },
          azioneFisica: { $first: "$azioneFisica" }
        }
      },
      { $match: { azioneFisica: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          codiceArticolo: 1,
          seriale: "$_id",
          dataMovimento: 1
        }
      },
      { $sort: { dataMovimento: -1, seriale: 1 } }
    ];

    const rows = await db.collection("Allocazione Magazzino").aggregate(pipeline).toArray();
    const expected = await db.collection("warehouse_giacenze").findOne(
      { codiceArticolo: codice },
      { projection: { _id: 0, giacenzaFisica: 1 } }
    );
    const expectedQty = Math.max(Number(expected?.giacenzaFisica || 0), 0);
    const missing = Math.max(expectedQty - rows.length, 0);
    if (missing > 0) {
      for (let i = 0; i < missing; i += 1) {
        rows.push({
          codiceArticolo: codice,
          seriale: `NON ASSEGNATO ${i + 1}`,
          dataMovimento: null,
          placeholder: true
        });
      }
    }
    res.json({ codice, rows, expectedQty });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento seriali", dettaglio: error.message });
  }
});

router.get("/movimenti", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 500);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const codiceArticolo = normalizeWarehouseCode(req.query.codiceArticolo || "");
    const sortBy = String(req.query.sortBy || "data").trim();
    const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortMap = {
      data: "Data",
      codDdt: "Cod_DDT",
      codiceArticolo: "Cod_Articolo",
      descrizioneArticolo: "Cod_Articolo",
      descrizioneMovimento: "Cod_Causale",
      quantita: "QT movimentata",
      unitaMisura: "Unità di Misura",
      costoAcquisto: "Costo di Acquisto",
      depositoIniziale: "Cod_Causale",
      depositoFinale: "Cod_Causale",
      prezzoVendita: "Prezzo di Vendita",
      nominativo: "Riferimento",
      varFisica: "Cod_Causale",
      varFiscale: "Cod_Causale",
      partNumber: "Part Number",
      note: "Note",
      codMovimento: "cod"
    };
    const sortField = sortMap[sortBy] || "Data";
    const sortSpec = { [sortField]: sortDir, cod: sortDir };

    const match = {};
    if (codiceArticolo) {
      match.Cod_Articolo = codiceArticolo;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      const articleCodeRows = await db
        .collection("Codici_di_magazzino")
        .find({ Descrizione: re }, { projection: { _id: 0, "Codice Articolo": 1 } })
        .limit(2000)
        .toArray();
      const articleCodesFromDescription = Array.from(
        new Set(articleCodeRows.map((row) => normalizeWarehouseCode(row["Codice Articolo"])).filter(Boolean))
      );
      match.$or = [
        { Cod_Articolo: re },
        { Riferimento: re },
        { Note: re },
        { "Part Number": re },
        ...(articleCodesFromDescription.length > 0 ? [{ Cod_Articolo: { $in: articleCodesFromDescription } }] : [])
      ];
    }

    const [rows, total] = await Promise.all([
      db
        .collection("Movimenti di magazzino")
        .find(match, { projection: { _id: 0 } })
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("Movimenti di magazzino").countDocuments(match)
    ]);

    const causaliCodes = Array.from(new Set(rows.map((r) => Number(r.Cod_Causale)).filter(Number.isFinite)));
    const articleCodes = Array.from(new Set(rows.map((r) => normalizeWarehouseCode(r.Cod_Articolo)).filter(Boolean)));
    const movementCodes = Array.from(new Set(rows.map((r) => Number(r.cod)).filter(Number.isFinite)));

    const [causali, articoli, allocazioni, depositi] = await Promise.all([
      causaliCodes.length
        ? db
            .collection("Causali di magazzino")
            .find(
              { cod: { $in: causaliCodes } },
              {
                projection: {
                  _id: 0,
                  cod: 1,
                  "Descrizione Movimento": 1,
                  "Azione su Giacenza Fisica": 1,
                  "Azione su Giacenza Fiscale": 1,
                  "Deposito Iniziale": 1,
                  "Deposito Finale": 1
                }
              }
            )
            .toArray()
        : [],
      articleCodes.length
        ? db
            .collection("Codici_di_magazzino")
            .find(
              { "Codice Articolo": { $in: articleCodes } },
              { projection: { _id: 0, "Codice Articolo": 1, Descrizione: 1 } }
            )
            .toArray()
        : [],
      movementCodes.length
        ? db
            .collection("Allocazione Magazzino")
            .find(
              { cod_movimento: { $in: movementCodes } },
              { projection: { _id: 0, cod_movimento: 1, Seriale: 1, Scaffale: 1, Riga: 1, Colonna: 1, Note: 1 } }
            )
            .toArray()
        : [],
      db
        .collection("Depositi_Fiscali")
        .find({}, { projection: { _id: 0, Cod: 1, Descrizione: 1 } })
        .toArray()
    ]);

    const causaliMap = new Map(causali.map((row) => [Number(row.cod), row]));
    const articoliMap = new Map(articoli.map((row) => [normalizeWarehouseCode(row["Codice Articolo"]), String(row.Descrizione || "")]));
    const depositiMap = new Map(depositi.map((row) => [Number(row.Cod), String(row.Descrizione || "")]));
    const serialiMap = new Map();
    const allocInfoMap = new Map();
    for (const row of allocazioni) {
      const movCode = Number(row.cod_movimento);
      const seriale = normalizeSerial(row.Seriale);
      if (!Number.isFinite(movCode)) continue;
      if (seriale) {
        const current = serialiMap.get(movCode) || [];
        if (!current.includes(seriale)) current.push(seriale);
        serialiMap.set(movCode, current);
      }
      if (!allocInfoMap.has(movCode)) {
        allocInfoMap.set(movCode, {
          scaffale: String(row.Scaffale || "").trim(),
          riga: String(row.Riga || "").trim(),
          colonna: String(row.Colonna || "").trim(),
          noteAllocazione: String(row.Note || "").trim()
        });
      }
    }

    const data = rows.map((row) => {
      const movCode = Number(row.cod);
      const seriali = serialiMap.get(movCode) || [];
      const allocInfo = allocInfoMap.get(movCode) || {};
      const causaleRow = causaliMap.get(Number(row.Cod_Causale)) || null;
      const depInizialeCod = Number(causaleRow?.["Deposito Iniziale"]);
      const depFinaleCod = Number(causaleRow?.["Deposito Finale"]);
      const unita =
        row["UnitÃƒÆ’Ã‚Â  di Misura"] ||
        row["UnitÃƒÂ  di Misura"] ||
        row["UnitÃ  di Misura"] ||
        row["UnitÃ  di misura"] ||
        "";
      return {
        codMovimento: movCode,
        data: row.Data || null,
        codDdt: Number(row.Cod_DDT || 0) || 0,
        codAllegato: Number(row.Cod_Allegato || 0) || 0,
        codAllegatoFoto: Number(row.Cod_Allegato_Foto || 0) || 0,
        hasAllegato: Number(row.Cod_Allegato || 0) > 0 || Number(row.Cod_Allegato_Foto || 0) > 0,
        codiceArticolo: normalizeWarehouseCode(row.Cod_Articolo),
        descrizioneArticolo:
          articoliMap.get(normalizeWarehouseCode(row.Cod_Articolo)) || String(row.Descrizione || "").trim(),
        descrizioneMovimento: String(causaleRow?.["Descrizione Movimento"] || ""),
        quantita: Number(row["QT movimentata"] || 0),
        unitaMisura: String(unita || "").trim(),
        seriale: seriali.join(", "),
        scaffale: String(allocInfo.scaffale || ""),
        riga: String(allocInfo.riga || ""),
        colonna: String(allocInfo.colonna || ""),
        nominativo: String(row.Riferimento || ""),
        costoAcquisto: Number(row["Costo di Acquisto"] || 0),
        prezzoVendita: Number(row["Prezzo di Vendita"] || 0),
        depositoIniziale: depositiMap.get(depInizialeCod) || (Number.isFinite(depInizialeCod) ? String(depInizialeCod) : ""),
        depositoFinale: depositiMap.get(depFinaleCod) || (Number.isFinite(depFinaleCod) ? String(depFinaleCod) : ""),
        varFisica: Number(causaleRow?.["Azione su Giacenza Fisica"] || 0),
        varFiscale: Number(causaleRow?.["Azione su Giacenza Fiscale"] || 0),
        note: String(row.Note || ""),
        noteAllocazione: String(allocInfo.noteAllocazione || ""),
        partNumber: String(row["Part Number"] || "")
      };
    });

    return res.json({ page, limit, total, data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento movimenti", dettaglio: error.message });
  }
});

router.get("/movimenti/:cod/allocazione", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const codMov = Number(req.params.cod);
    if (!Number.isFinite(codMov)) {
      return res.status(400).json({ errore: "Codice movimento non valido" });
    }
    const row = await db
      .collection("Allocazione Magazzino")
      .findOne(
        { cod_movimento: codMov },
        { projection: { _id: 0, cod_movimento: 1, cod_articolo: 1, Seriale: 1, Scaffale: 1, Riga: 1, Colonna: 1, Note: 1, cod: 1 } }
      );
    if (!row) {
      return res.json({
        allocazione: {
          codMovimento: codMov,
          codiceArticolo: "",
          seriale: "",
          scaffale: "",
          riga: "",
          colonna: "",
          note: ""
        }
      });
    }
    return res.json({
      allocazione: {
        codMovimento: codMov,
        codiceArticolo: String(row.cod_articolo || "").trim(),
        seriale: String(row.Seriale || "").trim(),
        scaffale: String(row.Scaffale || "").trim(),
        riga: String(row.Riga || "").trim(),
        colonna: String(row.Colonna || "").trim(),
        note: String(row.Note || "").trim()
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento allocazione", dettaglio: error.message });
  }
});

router.put("/movimenti/:cod/allocazione", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const codMov = Number(req.params.cod);
    if (!Number.isFinite(codMov)) {
      return res.status(400).json({ errore: "Codice movimento non valido" });
    }
    const scaffale = String(req.body?.scaffale || "").trim();
    const riga = String(req.body?.riga || "").trim();
    const colonna = String(req.body?.colonna || "").trim();
    const note = String(req.body?.note || "").trim();
    const seriale = normalizeSerial(req.body?.seriale || "");
    const codiceArticolo = normalizeWarehouseCode(req.body?.codiceArticolo || "");

    if (!scaffale) {
      return res.status(400).json({ errore: "Scaffale obbligatorio" });
    }

    const existing = await db
      .collection("Allocazione Magazzino")
      .findOne({ cod_movimento: codMov }, { projection: { _id: 1, cod: 1 } });

    if (existing?._id) {
      await db.collection("Allocazione Magazzino").updateOne(
        { _id: existing._id },
        {
          $set: {
            Scaffale: scaffale,
            Riga: riga,
            Colonna: colonna,
            Note: note,
            ...(seriale ? { Seriale: seriale } : {}),
            ...(codiceArticolo ? { cod_articolo: codiceArticolo } : {})
          }
        }
      );
    } else {
      const lastAlloc = await db
        .collection("Allocazione Magazzino")
        .find({}, { projection: { cod: 1 } })
        .sort({ cod: -1 })
        .limit(1)
        .toArray();
      const nextCod = Number(lastAlloc?.[0]?.cod || 0) + 1;
      await db.collection("Allocazione Magazzino").insertOne({
        cod_movimento: codMov,
        cod_articolo: codiceArticolo || null,
        Seriale: seriale || null,
        Scaffale: scaffale,
        Riga: riga,
        Colonna: colonna,
        Note: note,
        cod: nextCod,
        Deposito: null
      });
    }

    return res.json({
      ok: true,
      allocazione: {
        codMovimento: codMov,
        codiceArticolo,
        seriale,
        scaffale,
        riga,
        colonna,
        note
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore aggiornamento allocazione", dettaglio: error.message });
  }
});

router.get("/causali", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const tipo = String(req.query.tipo || "").toLowerCase();
    const soloNonNascoste = String(req.query.soloNonNascoste || "1") === "1";

    const match = {};
    if (soloNonNascoste) {
      match.Nascondi = { $ne: true };
    }
    if (tipo === "carico") {
      match["Azione su Giacenza Fisica"] = { $gt: 0 };
    }
    if (tipo === "scarico") {
      match["Azione su Giacenza Fisica"] = { $lt: 0 };
    }

    const [causali, depositi] = await Promise.all([
      db
        .collection("Causali di magazzino")
        .find(match, { projection: { _id: 0 } })
        .sort({ "Descrizione Movimento": 1 })
        .toArray(),
      db
        .collection("Depositi_Fiscali")
        .find({}, { projection: { _id: 0, Cod: 1, Descrizione: 1 } })
        .toArray()
    ]);

    const depositoMap = new Map(depositi.map((d) => [Number(d.Cod), d.Descrizione]));
    const data = causali.map((row) => {
      const depIniziale = Number(row["Deposito Iniziale"]);
      const depFinale = Number(row["Deposito Finale"]);
      return {
        cod: row.cod,
        descrizioneMovimento: row["Descrizione Movimento"],
        depositoIniziale: depIniziale,
        depositoFinale: depFinale,
        depositoInizialeNome: depositoMap.get(depIniziale) || String(depIniziale || "-"),
        depositoFinaleNome: depositoMap.get(depFinale) || String(depFinale || "-"),
        nascondi: row.Nascondi === true,
        note: row.Note || "",
        azioneFisica: row["Azione su Giacenza Fisica"] ?? 0,
        azioneFiscale: row["Azione su Giacenza Fiscale"] ?? 0
      };
    });

    res.json({ tipo, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento causali", dettaglio: error.message });
  }
});

router.get("/articoli", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 10), 2000);

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ "Codice Articolo": re }, { Descrizione: re }];
    }

    const rows = await db
      .collection("Codici_di_magazzino")
      .find(match, { projection: { _id: 0 } })
      .sort({ "Codice Articolo": 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      codiceArticolo: row["Codice Articolo"],
      descrizione: row.Descrizione || "",
      tipo: row.Tipo || "",
      marca: row.Marca || "",
      centroDiCosto: row["Centro di Costo"] || "",
      valorizza: row.Valorizza === true,
      unitaMisura:
        row["UnitÃƒÂ  di Misura"] ||
        row["UnitÃ  di Misura"] ||
        row["UnitÃ  di misura"] ||
        row["Unità di Misura"] ||
        row["Unità di misura"] ||
        "",
      ammetteSeriale: row["Ammette Seriale"] === true,
      obsoleto: row.Obsoleto === true,
      costoAcquisto: row["Costo di Acquisto"] ?? null,
      prezzoVendita: row["Prezzo di Vendita"] ?? null,
      partNumber: row["Part Number"] || "",
      vendorCode: row["Vendor Code"] || "",
      alertGiacenza: row["Alert Giacenza"] === true,
      giacenzaMinima: row["Giacenza Minina"] ?? null,
      note: row.Note || ""
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento articoli", dettaglio: error.message });
  }
});

router.get("/fornitori", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const tipo = String(req.query.tipo || "fornitori").toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "500", 10), 10), 5000);

    const match = {};
    if (tipo === "fornitori") {
      match.Tipo = /FORNITORE/i;
    } else if (tipo === "clienti") {
      match.Tipo = /CLIENTE/i;
    }
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ Nominativo: re }, { PIVA: re }];
    }

    const rows = await db
      .collection("Cli_For")
      .find(match, { projection: { _id: 0 } })
      .sort({ Nominativo: 1 })
      .limit(limit)
      .toArray();

    const data = rows.map((row) => ({
      cod: row.COD,
      nominativo: row.Nominativo || "",
      tipo: row.Tipo || "",
      piva: row.PIVA || "",
      indirizzo: row.Indirizzo || "",
      citta: row.Citta || "",
      cap: row.CAP || "",
      provincia: row.Provincia || "",
      regione: row.Regione || "",
      note: row.Note || "",
      agenziaRiferimento: row["Agenzia di Riferimento"] || row["Agenzia di riferimento"] || row["Agenzia Riferimento"] || ""
    }));

    res.json({ tipo, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento fornitori", dettaglio: error.message });
  }
});

router.post("/fornitori", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const payload = req.body || {};

    const tipo = String(payload.tipo || "FORNITORE").trim().toUpperCase();
    const nominativo = String(payload.nominativo || "").trim();
    const piva = String(payload.piva || "").trim();
    const indirizzo = String(payload.indirizzo || "").trim();
    const citta = String(payload.citta || "").trim();
    const cap = String(payload.cap || "").trim();
    const provincia = String(payload.provincia || "").trim().toUpperCase();
    const regione = String(payload.regione || "").trim();
    const codFiscale = String(payload.codFiscale || "").trim();
    const telefoni = String(payload.telefoni || "").trim();
    const email = String(payload.email || "").trim();
    const pec = String(payload.pec || "").trim();
    const note = String(payload.note || "").trim();

    if (!nominativo) return res.status(400).json({ errore: "Nominativo obbligatorio" });
    if (!piva) return res.status(400).json({ errore: "P.IVA obbligatoria" });

    const duplicate = await db.collection("Cli_For").findOne(
      { $or: [{ Nominativo: nominativo }, { PIVA: piva }] },
      { projection: { _id: 0, COD: 1, Nominativo: 1, PIVA: 1 } }
    );
    if (duplicate) {
      return res.status(409).json({ errore: "Anagrafica gia presente con stesso nominativo o P.IVA" });
    }

    const last = await db
      .collection("Cli_For")
      .find({}, { projection: { _id: 0, COD: 1 } })
      .sort({ COD: -1 })
      .limit(1)
      .toArray();
    const nextCod = Number(last?.[0]?.COD || 0) + 1;
    const now = new Date();

    const doc = {
      COD: nextCod,
      Tipo: tipo || "FORNITORE",
      Nominativo: nominativo,
      Indirizzo: indirizzo,
      Citta: citta,
      CAP: cap,
      Provincia: provincia,
      Regione: regione,
      PIVA: piva,
      "Cod Fiscale": codFiscale,
      telefoni,
      email1: email,
      PEC: pec,
      Note: note,
      LastEditDate: now,
      CreationDate: now
    };

    await db.collection("Cli_For").insertOne(doc);

    return res.status(201).json({
      ok: true,
      anagrafica: {
        cod: nextCod,
        nominativo,
        tipo: doc.Tipo,
        piva,
        indirizzo,
        citta,
        cap,
        provincia,
        regione,
        note
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore creazione anagrafica", dettaglio: error.message });
  }
});

router.get("/ddt/template-base", async (_req, res) => {
  try {
    const picked = pickDdtTemplateBase();
    return res.json({
      selected: picked.selected,
      templatesDir: "backend/src/templates",
      candidates: picked.candidates
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore lettura template DDT", dettaglio: error.message });
  }
});

router.get("/ddt/template-preview", async (req, res) => {
  try {
    const requested = safeTemplateName(req.query.name);
    const picked = pickDdtTemplateBase();
    const templateName = requested || picked.selected;
    if (!templateName) {
      return res.status(404).json({ errore: "Nessun template disponibile" });
    }
    const payload = buildTemplatePreviewPayload(templateName);
    if (!payload.ok) {
      return res.status(400).json({ errore: payload.errore || "Template non leggibile" });
    }
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ errore: "Errore anteprima template DDT", dettaglio: error.message });
  }
});

router.get("/ddt", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "500", 10), 10), 2000);

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { "N DDT": re },
        { "Trasporto a mezzo": re },
        { "Indirizzo destinazione": re },
        { Note: re },
        { Note2: re }
      ];
    }

    const ddtRows = await db
      .collection("DDT")
      .find(match, {
        projection: {
          _id: 0,
          cod: 1,
          data: 1,
          "N DDT": 1,
          Cod_Cliente: 1,
          Cod_Causale: 1,
          "Indirizzo destinazione": 1,
          "Trasporto a mezzo": 1,
          Note: 1,
          Note2: 1
        }
      })
      .sort({ data: -1, cod: -1 })
      .limit(limit)
      .toArray();

    const clientiCodes = Array.from(new Set(ddtRows.map((r) => Number(r.Cod_Cliente)).filter(Number.isFinite)));
    const causaliCodes = Array.from(new Set(ddtRows.map((r) => Number(r.Cod_Causale)).filter(Number.isFinite)));

    const [clienti, causali] = await Promise.all([
      clientiCodes.length
        ? db
            .collection("Cli_For")
            .find({ COD: { $in: clientiCodes } }, { projection: { _id: 0, COD: 1, Nominativo: 1 } })
            .toArray()
        : [],
      causaliCodes.length
        ? db
            .collection("Causali di magazzino")
            .find({ cod: { $in: causaliCodes } }, { projection: { _id: 0, cod: 1, "Descrizione Movimento": 1 } })
            .toArray()
        : []
    ]);

    const clientiMap = new Map(clienti.map((c) => [Number(c.COD), String(c.Nominativo || "")]));
    const causaliMap = new Map(causali.map((c) => [Number(c.cod), String(c["Descrizione Movimento"] || "")]));

    const data = ddtRows.map((row) => {
      const cod = Number(row.cod);
      const noteInterne = [row.Note, row.Note2].filter(Boolean).join(" ").trim();
      return {
        cod,
        numeroDdt: String(row["N DDT"] || ""),
        data: row.data || null,
        codCliente: Number(row.Cod_Cliente || 0) || null,
        nominativo: clientiMap.get(Number(row.Cod_Cliente)) || "",
        indirizzoDestinazione: String(row["Indirizzo destinazione"] || ""),
        trasportoMezzo: String(row["Trasporto a mezzo"] || ""),
        descrizioneMovimento: causaliMap.get(Number(row.Cod_Causale)) || "",
        noteInterne,
        codCausale: Number(row.Cod_Causale || 0) || null
      };
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento DDT", dettaglio: error.message });
  }
});

router.get("/ddt/:cod", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const cod = Number(req.params.cod);
    if (!Number.isFinite(cod)) {
      return res.status(400).json({ errore: "Codice DDT non valido" });
    }

    const ddt = await db
      .collection("DDT")
      .findOne({ cod }, { projection: { _id: 0 } });
    if (!ddt) {
      return res.status(404).json({ errore: "DDT non trovato" });
    }

    const [cliente, causale, items] = await Promise.all([
      db.collection("Cli_For").findOne(
        { COD: Number(ddt.Cod_Cliente || 0) },
        { projection: { _id: 0, COD: 1, Nominativo: 1 } }
      ),
      db.collection("Causali di magazzino").findOne(
        { cod: Number(ddt.Cod_Causale || 0) },
        { projection: { _id: 0, cod: 1, "Descrizione Movimento": 1 } }
      ),
      db
        .collection("VociDDT_FM")
        .find({ Cod_DDT: cod }, { projection: { _id: 0 } })
        .sort({ cod: 1 })
        .toArray()
    ]);

    const articoli = items.map((item) => ({
      codiceArticolo: String(item["Codice Articolo"] || ""),
      quantita: Number(item["QT movimentata"] || 0),
      seriale: String(item.Seriale || "").trim(),
      descrizione: String(item.Descrizione || "")
    }));

    return res.json({
      dettaglio: {
        cod,
        numeroDdt: String(ddt["N DDT"] || ""),
        data: ddt.data || null,
        causale: String(causale?.["Descrizione Movimento"] || ""),
        nominativo: String(cliente?.Nominativo || ""),
        indirizzoDestinazione: String(ddt["Indirizzo destinazione"] || ""),
        trasportoMezzo: String(ddt["Trasporto a mezzo"] || ""),
        noteInterne: [ddt.Note, ddt.Note2].filter(Boolean).join(" ").trim(),
        articoli
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento dettaglio DDT", dettaglio: error.message });
  }
});

router.post("/articoli", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const payload = req.body || {};

    const codiceArticolo = normalizeWarehouseCode(payload.codiceArticolo || payload["Codice Articolo"]);
    const descrizione = String(payload.descrizione || payload.Descrizione || "").trim();
    const tipo = String(payload.tipo || payload.Tipo || "").trim().toUpperCase();
    const centroDiCosto = String(payload.centroDiCosto || payload["Centro di Costo"] || "").trim().toUpperCase();
    const unitaMisura = String(payload.unitaMisura || payload["Unità di Misura"] || payload["UnitÃ  di Misura"] || "QT")
      .trim()
      .toUpperCase();
    const marca = String(payload.marca || payload.Marca || "").trim();
    const valorizza = parseBool(payload.valorizza, false);
    const ammetteSeriale = parseBool(payload.ammetteSeriale, false);
    const prezzoVendita = payload.prezzoVendita !== undefined && payload.prezzoVendita !== null && payload.prezzoVendita !== ""
      ? Number(payload.prezzoVendita)
      : null;
    const costoAcquisto = payload.costoAcquisto !== undefined && payload.costoAcquisto !== null && payload.costoAcquisto !== ""
      ? Number(payload.costoAcquisto)
      : null;
    const partNumber = String(payload.partNumber || payload["Part Number"] || "").trim();
    const vendorCode = String(payload.vendorCode || payload["Vendor Code"] || "").trim();
    const alertGiacenza = parseBool(payload.alertGiacenza, false);
    const giacenzaMinima = payload.giacenzaMinima !== undefined && payload.giacenzaMinima !== null && payload.giacenzaMinima !== ""
      ? Number(payload.giacenzaMinima)
      : null;
    const obsoleto = parseBool(payload.obsoleto, false);
    const note = String(payload.note || payload.Note || "").trim();

    if (!codiceArticolo || !descrizione || !tipo || !centroDiCosto) {
      return res.status(400).json({ errore: "Campi obbligatori mancanti: codice, descrizione, tipo, centro di costo" });
    }
    if ((prezzoVendita !== null && !Number.isFinite(prezzoVendita)) || (costoAcquisto !== null && !Number.isFinite(costoAcquisto))) {
      return res.status(400).json({ errore: "Prezzo/Costo non validi" });
    }
    if (giacenzaMinima !== null && !Number.isFinite(giacenzaMinima)) {
      return res.status(400).json({ errore: "Giacenza minima non valida" });
    }

    const existing = await db.collection("Codici_di_magazzino").findOne(
      { "Codice Articolo": codiceArticolo },
      { projection: { _id: 0, "Codice Articolo": 1 } }
    );
    if (existing) {
      return res.status(409).json({ errore: `Articolo già presente: ${codiceArticolo}` });
    }

    const now = new Date();
    const doc = {
      "Codice Articolo": codiceArticolo,
      Descrizione: descrizione,
      Tipo: tipo,
      Marca: marca || null,
      "Centro di Costo": centroDiCosto,
      Valorizza: valorizza,
      "Ammette Seriale": ammetteSeriale,
      "Unità di Misura": unitaMisura,
      "UnitÃ  di Misura": unitaMisura,
      Note: note || null,
      "Costo di Acquisto": costoAcquisto,
      "Prezzo di Vendita": prezzoVendita,
      "Part Number": partNumber || null,
      "Vendor Code": vendorCode || null,
      "Alert Giacenza": alertGiacenza,
      "Giacenza Minina": giacenzaMinima,
      Obsoleto: obsoleto,
      LastEditDate: now,
      CreationDate: now
    };

    await db.collection("Codici_di_magazzino").insertOne(doc);
    await refreshWarehouseCacheByCodes(db, [codiceArticolo]);

    res.status(201).json({
      ok: true,
      articolo: {
        codiceArticolo,
        descrizione,
        tipo,
        marca,
        centroDiCosto,
        valorizza,
        ammetteSeriale,
        unitaMisura,
        costoAcquisto,
        prezzoVendita,
        partNumber,
        vendorCode,
        alertGiacenza,
        giacenzaMinima,
        obsoleto,
        note
      }
    });
  } catch (error) {
    res.status(500).json({ errore: "Errore salvataggio articolo", dettaglio: error.message });
  }
});

router.post("/carico", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const { causale, dataMovimento, fornitore, items } = req.body || {};
    if (!causale || !dataMovimento || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errore: "Dati carico incompleti" });
    }

    const last = await db
      .collection("Movimenti di magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextCod = Number(last?.[0]?.cod || 0) + 1;

    const now = new Date();
    const date = new Date(dataMovimento);
    const normalizedItems = items.map((item, index) => {
      const qty = Number(item.quantita);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: minimo consentito 1`);
      }
      const articolo = item.articolo || {};
      const codiceArticolo = normalizeWarehouseCode(articolo.codiceArticolo || item.codiceArticolo);
      if (!codiceArticolo) {
        throw new Error(`Codice articolo mancante alla riga ${index + 1}`);
      }
      const seriale = normalizeSerial(item.seriale || item.seriali?.[0] || "");
      const ammetteSeriale = articolo?.ammetteSeriale === true;
      if (ammetteSeriale && !seriale) {
        throw new Error(`Seriale obbligatorio alla riga ${index + 1} per l'articolo ${codiceArticolo}`);
      }
      if (ammetteSeriale && qty !== 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: per articoli serializzati usare quantita 1`);
      }
      return {
        item,
        articolo,
        qty,
        codiceArticolo,
        seriale
      };
    });

    const seenInPayload = new Set();
    for (const [idx, row] of normalizedItems.entries()) {
      if (!row.seriale) continue;
      const key = `${row.codiceArticolo}::${row.seriale}`;
      if (seenInPayload.has(key)) {
        throw new Error(`Seriale duplicato nel carico (riga ${idx + 1}): ${row.seriale} per articolo ${row.codiceArticolo}`);
      }
      seenInPayload.add(key);
    }

    const activeSerialSet = await getActiveSerialSet(
      db,
      normalizedItems.map((row) => ({ codiceArticolo: row.codiceArticolo, seriale: row.seriale }))
    );
    for (const [idx, row] of normalizedItems.entries()) {
      if (!row.seriale) continue;
      const key = `${row.codiceArticolo}::${row.seriale}`;
      if (activeSerialSet.has(key)) {
        throw new Error(
          `Seriale gia presente in magazzino (riga ${idx + 1}): ${row.seriale} per articolo ${row.codiceArticolo}`
        );
      }
    }

    const docs = normalizedItems.map(({ item, articolo, qty, codiceArticolo }) => {
      return {
        Data: Number.isNaN(date.getTime()) ? now : date,
        Cod_Causale: Number(causale.cod),
        Cod_Articolo: codiceArticolo,
        "QT movimentata": qty,
        "Part Number": articolo.partNumber || item.partNumber || null,
        "Costo di Acquisto": articolo.costoAcquisto ?? null,
        "Prezzo di Vendita": null,
        Cod_DDT: null,
        Note: item.note || "",
        cod: nextCod++,
        cod_azienda: 1,
        cod_cliente: fornitore?.cod ?? null,
        Riferimento: fornitore?.nominativo || "",
        LastEditDate: now,
        CreationDate: now,
        Cod_Allegato: null,
        Cod_Allegato_Foto: null,
        "UnitÃƒÂ  di Misura": articolo.unitaMisura || null
      };
    });

    await db.collection("Movimenti di magazzino").insertMany(docs);

    const lastAlloc = await db
      .collection("Allocazione Magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextAllocCod = Number(lastAlloc?.[0]?.cod || 0) + 1;
    const deposito = Number(causale?.depositoFinale ?? causale?.depositoIniziale ?? 0);
    const allocazioni = normalizedItems.map(({ item, articolo, seriale }, index) => {
      return {
        cod_articolo: docs[index].Cod_Articolo,
        Seriale: seriale || null,
        Scaffale: String(item?.scaffale ?? articolo?.scaffale ?? ""),
        Riga: String(item?.riga ?? articolo?.riga ?? ""),
        Colonna: String(item?.colonna ?? articolo?.colonna ?? ""),
        Note: String(item?.note || ""),
        cod_movimento: docs[index].cod,
        cod: nextAllocCod++,
        Deposito: deposito
      };
    });
    if (allocazioni.length > 0) {
      await db.collection("Allocazione Magazzino").insertMany(allocazioni);
    }

    const codes = docs.map((doc) => doc.Cod_Articolo).filter(Boolean);
    await refreshWarehouseCacheByCodes(db, codes);

    res.json({ ok: true, inserted: docs.length, allocazioni: allocazioni.length });
  } catch (error) {
    res.status(500).json({ errore: "Errore salvataggio carico", dettaglio: error.message });
  }
});

router.post("/ddt", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const payload = req.body || {};
    const data = payload.data ? new Date(payload.data) : new Date();
    const codCliente = Number(payload.codCliente);
    const codCausale = payload.codCausale !== undefined && payload.codCausale !== null ? Number(payload.codCausale) : null;
    const numeroDdt = String(payload.numeroDdt || "").trim();
    const indirizzoDestinazione = String(payload.indirizzoDestinazione || "").trim();
    const trasportoMezzo = String(payload.trasportoMezzo || "").trim();
    const note = String(payload.note || "").trim();
    const note2 = String(payload.note2 || "").trim();
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!Number.isFinite(codCliente)) {
      return res.status(400).json({ errore: "Cliente/riferimento non valido" });
    }
    if (!indirizzoDestinazione) {
      return res.status(400).json({ errore: "Indirizzo destinazione obbligatorio" });
    }
    if (!trasportoMezzo) {
      return res.status(400).json({ errore: "Trasporto a mezzo obbligatorio" });
    }

    const lastDdt = await db.collection("DDT").find({}, { projection: { _id: 0, cod: 1, Progressivo: 1 } }).sort({ cod: -1 }).limit(1).toArray();
    const nextCod = Number(lastDdt?.[0]?.cod || 0) + 1;
    const nextProgressivo = Number(lastDdt?.[0]?.Progressivo || 0) + 1;
    const now = new Date();

    const ddtDoc = {
      data: Number.isNaN(data.getTime()) ? now : data,
      cod: nextCod,
      "N DDT": numeroDdt || String(nextCod),
      Cod_Cliente: codCliente,
      Cod_Azienda: 1,
      Cod_Causale: Number.isFinite(codCausale) ? codCausale : null,
      "Indirizzo destinazione": indirizzoDestinazione,
      "Trasporto a mezzo": trasportoMezzo,
      LastEditDate: now,
      CreationDate: now,
      Progressivo: nextProgressivo,
      Note: note || null,
      Note2: note2 || null,
      Cod_Allegato: null
    };
    await db.collection("DDT").insertOne(ddtDoc);

    let insertedRows = 0;
    if (items.length > 0) {
      const lastVoc = await db.collection("VociDDT_FM").find({}, { projection: { _id: 0, cod: 1 } }).sort({ cod: -1 }).limit(1).toArray();
      let nextVocCod = Number(lastVoc?.[0]?.cod || 0) + 1;
      const vocDocs = items
        .map((item) => ({
          "Codice Articolo": String(item?.codiceArticolo || "").trim(),
          Descrizione: String(item?.descrizione || "").trim(),
          Seriale: String(item?.seriale || "").trim() || null,
          "QT movimentata": Math.max(Number(item?.quantita || 0), 0),
          Cod_DDT: nextCod,
          cod: nextVocCod++
        }))
        .filter((row) => row["Codice Articolo"]);
      if (vocDocs.length > 0) {
        await db.collection("VociDDT_FM").insertMany(vocDocs);
        insertedRows = vocDocs.length;
      }
    }

    return res.status(201).json({
      ok: true,
      ddt: {
        cod: nextCod,
        numeroDdt: ddtDoc["N DDT"],
        data: ddtDoc.data,
        codCliente,
        codCausale: ddtDoc.Cod_Causale,
        indirizzoDestinazione,
        trasportoMezzo,
        noteInterne: [note, note2].filter(Boolean).join(" ").trim(),
        righe: insertedRows
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore creazione DDT", dettaglio: error.message });
  }
});

router.post("/scarico", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const { causale, dataMovimento, riferimento, items } = req.body || {};
    if (!causale || !dataMovimento || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errore: "Dati scarico incompleti" });
    }

    const last = await db
      .collection("Movimenti di magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextCod = Number(last?.[0]?.cod || 0) + 1;

    const now = new Date();
    const date = new Date(dataMovimento);
    const normalizedItems = items.map((item, index) => {
      const qty = Number(item.quantita);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: minimo consentito 1`);
      }
      const articolo = item.articolo || {};
      const codiceArticolo = normalizeWarehouseCode(articolo.codiceArticolo || item.codiceArticolo);
      if (!codiceArticolo) {
        throw new Error(`Codice articolo mancante alla riga ${index + 1}`);
      }
      const seriale = normalizeSerial(item.seriale || item.seriali?.[0] || "");
      const ammetteSeriale = articolo?.ammetteSeriale === true;
      if (ammetteSeriale && !seriale) {
        throw new Error(`Seriale obbligatorio alla riga ${index + 1} per l'articolo ${codiceArticolo}`);
      }
      if (ammetteSeriale && qty !== 1) {
        throw new Error(`Quantita non valida alla riga ${index + 1}: per articoli serializzati usare quantita 1`);
      }
      return { item, articolo, qty, codiceArticolo, seriale };
    });

    const stockByCode = await getStockByCodes(db, normalizedItems.map((row) => row.codiceArticolo));
    const requestedByCode = new Map();
    for (const row of normalizedItems) {
      requestedByCode.set(row.codiceArticolo, Number(requestedByCode.get(row.codiceArticolo) || 0) + row.qty);
    }
    for (const [codiceArticolo, requested] of requestedByCode.entries()) {
      const stock = stockByCode.get(codiceArticolo) || { fisica: 0 };
      if (requested > Number(stock.fisica || 0)) {
        throw new Error(`Disponibilita insufficiente per ${codiceArticolo}: richieste ${requested}, disponibili ${Number(stock.fisica || 0)}`);
      }
    }

    const activeSerialSet = await getActiveSerialSet(
      db,
      normalizedItems.map((row) => ({ codiceArticolo: row.codiceArticolo, seriale: row.seriale }))
    );
    for (const [idx, row] of normalizedItems.entries()) {
      if (!row.seriale) continue;
      const key = `${row.codiceArticolo}::${row.seriale}`;
      if (!activeSerialSet.has(key)) {
        throw new Error(`Seriale non disponibile in magazzino (riga ${idx + 1}): ${row.seriale} per articolo ${row.codiceArticolo}`);
      }
    }

    const docs = normalizedItems.map(({ item, articolo, qty, codiceArticolo }) => ({
      Data: Number.isNaN(date.getTime()) ? now : date,
      Cod_Causale: Number(causale.cod),
      Cod_Articolo: codiceArticolo,
      "QT movimentata": qty,
      "Part Number": articolo.partNumber || item.partNumber || null,
      "Costo di Acquisto": articolo.costoAcquisto ?? null,
      "Prezzo di Vendita": articolo.prezzoVendita ?? null,
      Cod_DDT: null,
      Note: item.note || "",
      cod: nextCod++,
      cod_azienda: 1,
      cod_cliente: riferimento?.cod ?? null,
      Riferimento: riferimento?.nominativo || "",
      LastEditDate: now,
      CreationDate: now,
      Cod_Allegato: null,
      Cod_Allegato_Foto: null,
      "UnitÃƒÆ’Ã‚Â  di Misura": articolo.unitaMisura || null
    }));

    await db.collection("Movimenti di magazzino").insertMany(docs);

    const lastAlloc = await db
      .collection("Allocazione Magazzino")
      .find({}, { projection: { cod: 1 } })
      .sort({ cod: -1 })
      .limit(1)
      .toArray();
    let nextAllocCod = Number(lastAlloc?.[0]?.cod || 0) + 1;
    const deposito = Number(causale?.depositoFinale ?? causale?.depositoIniziale ?? 0);
    const allocazioni = normalizedItems.map(({ item, articolo, seriale }, index) => ({
      cod_articolo: docs[index].Cod_Articolo,
      Seriale: seriale || null,
      Scaffale: String(item?.scaffale ?? articolo?.scaffale ?? ""),
      Riga: String(item?.riga ?? articolo?.riga ?? ""),
      Colonna: String(item?.colonna ?? articolo?.colonna ?? ""),
      Note: String(item?.note || ""),
      cod_movimento: docs[index].cod,
      cod: nextAllocCod++,
      Deposito: deposito
    }));
    if (allocazioni.length > 0) {
      await db.collection("Allocazione Magazzino").insertMany(allocazioni);
    }

    const codes = docs.map((doc) => doc.Cod_Articolo).filter(Boolean);
    await refreshWarehouseCacheByCodes(db, codes);

    return res.json({ ok: true, inserted: docs.length, allocazioni: allocazioni.length });
  } catch (error) {
    return res.status(500).json({ errore: "Errore salvataggio scarico", dettaglio: error.message });
  }
});

router.get("/maps", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 500);
    const skip = (page - 1) * limit;
    const query = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.name = re;
    }
    const [rows, total] = await Promise.all([
      db
        .collection("warehouse_maps")
        .find(
          query,
          {
            projection: {
              _id: 1,
              name: 1,
              address: 1,
              notes: 1,
              lastUpdatedAt: 1,
              layout: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        )
        .sort({ updatedAt: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("warehouse_maps").countDocuments(query)
    ]);
    const data = rows.map((row) => ({
      id: String(row._id),
      name: String(row.name || ""),
      address: String(row.address || ""),
      notes: String(row.notes || ""),
      lastUpdatedAt: row.lastUpdatedAt || null,
      blocksCount: Array.isArray(row?.layout?.blocks) ? row.layout.blocks.length : 0,
      createdAt: row.createdAt || null,
      updatedAt: row.updatedAt || null
    }));
    return res.json({ page, limit, total, data });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento magazzini", dettaglio: error.message });
  }
});

router.post("/maps", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const name = normalizeMapName(req.body?.name);
    const address = String(req.body?.address || "").trim();
    const notes = String(req.body?.notes || "").trim();
    if (!name) {
      return res.status(400).json({ errore: "Nome magazzino obbligatorio" });
    }
    const now = new Date();
    const lastUpdatedAt = toDateOrNull(req.body?.lastUpdatedAt) || now;
    const layout = normalizeMapLayout(req.body?.layout || {});
    const doc = {
      name,
      address,
      notes,
      lastUpdatedAt,
      layout,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.collection("warehouse_maps").insertOne(doc);
    return res.status(201).json({
      ok: true,
      warehouse: {
        id: String(result.insertedId),
        name,
        address,
        notes,
        lastUpdatedAt,
        layout,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ errore: "Esiste gia un magazzino con questo nome" });
    }
    return res.status(500).json({ errore: "Errore creazione magazzino", dettaglio: error.message });
  }
});

router.get("/maps/:id", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ errore: "ID magazzino non valido" });
    }
    const row = await db
      .collection("warehouse_maps")
      .findOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          projection: {
            _id: 1,
            name: 1,
            address: 1,
            notes: 1,
            lastUpdatedAt: 1,
            layout: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      );
    if (!row) {
      return res.status(404).json({ errore: "Magazzino non trovato" });
    }
    return res.json({
      warehouse: {
        id: String(row._id),
        name: String(row.name || ""),
        address: String(row.address || ""),
        notes: String(row.notes || ""),
        lastUpdatedAt: row.lastUpdatedAt || null,
        layout: normalizeMapLayout(row.layout || {}),
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null
      }
    });
  } catch (error) {
    return res.status(500).json({ errore: "Errore caricamento magazzino", dettaglio: error.message });
  }
});

router.put("/maps/:id", async (req, res) => {
  try {
    ensureIndexesInBackground();
    const db = getWarehouseDb();
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ errore: "ID magazzino non valido" });
    }
    const set = { updatedAt: new Date() };
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = normalizeMapName(req.body?.name);
      if (!name) return res.status(400).json({ errore: "Nome magazzino obbligatorio" });
      set.name = name;
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "address")) {
      set.address = String(req.body?.address || "").trim();
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "notes")) {
      set.notes = String(req.body?.notes || "").trim();
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "lastUpdatedAt")) {
      const parsed = toDateOrNull(req.body?.lastUpdatedAt);
      set.lastUpdatedAt = parsed || new Date();
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "layout")) {
      set.layout = normalizeMapLayout(req.body?.layout || {});
    }
    const filter = { _id: new mongoose.Types.ObjectId(id) };
    const result = await db.collection("warehouse_maps").findOneAndUpdate(
      filter,
      { $set: set },
      {
        returnDocument: "after",
        projection: {
          _id: 1,
          name: 1,
          address: 1,
          notes: 1,
          lastUpdatedAt: 1,
          layout: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );
    const row = result?.value || result;
    if (!row) {
      return res.status(404).json({ errore: "Magazzino non trovato" });
    }
    return res.json({
      ok: true,
      warehouse: {
        id: String(row._id),
        name: String(row.name || ""),
        address: String(row.address || ""),
        notes: String(row.notes || ""),
        lastUpdatedAt: row.lastUpdatedAt || null,
        layout: normalizeMapLayout(row.layout || {}),
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ errore: "Esiste gia un magazzino con questo nome" });
    }
    return res.status(500).json({ errore: "Errore aggiornamento magazzino", dettaglio: error.message });
  }
});

router.post("/scan-sessions", (req, res) => {
  cleanupExpiredScanSessions();
  const id = crypto.randomUUID();
  const baseUrl = getScanBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({ errore: "Impossibile determinare l'URL base per la scansione mobile" });
  }
  const mobileUrl = `${baseUrl}/mobile-scan/${encodeURIComponent(id)}`;
  const now = Date.now();
  scanSessions.set(id, {
    id,
    status: "waiting",
    seriale: "",
    error: "",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + SCAN_SESSION_TTL_MS,
    context: String(req.body?.context || "")
  });
  return res.status(201).json({
    ok: true,
    sessionId: id,
    mobileUrl,
    expiresAt: new Date(now + SCAN_SESSION_TTL_MS).toISOString()
  });
});

router.get("/scan-sessions/:id", (req, res) => {
  cleanupExpiredScanSessions();
  const id = String(req.params.id || "");
  const session = scanSessions.get(id);
  if (!session) {
    return res.status(404).json({ errore: "Sessione di scansione non trovata o scaduta" });
  }
  return res.json({
    ok: true,
    sessionId: session.id,
    status: session.status,
    seriale: session.seriale || "",
    errore: session.error || "",
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString()
  });
});

router.delete("/scan-sessions/:id", (req, res) => {
  const id = String(req.params.id || "");
  scanSessions.delete(id);
  return res.json({ ok: true });
});

router.post("/scan-sessions/:id/scan", async (req, res) => {
  cleanupExpiredScanSessions();
  const id = String(req.params.id || "");
  const session = scanSessions.get(id);
  if (!session) {
    return res.status(404).json({ errore: "Sessione di scansione non trovata o scaduta" });
  }
  const imageDataUrl = String(req.body?.imageDataUrl || "");
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageDataUrl)) {
    return res.status(400).json({ errore: "Immagine non valida: usa un data URL base64" });
  }

  session.status = "processing";
  session.updatedAt = Date.now();
  session.error = "";
  session.seriale = "";

  try {
    const seriale = await extractSerialFromImageWithOpenAI(imageDataUrl);
    session.status = "ready";
    session.seriale = seriale;
    session.updatedAt = Date.now();
    scanSessions.set(id, session);
    return res.json({ ok: true, sessionId: id, status: "ready", seriale });
  } catch (error) {
    session.status = "error";
    session.error = error.message || "Errore estrazione seriale";
    session.updatedAt = Date.now();
    scanSessions.set(id, session);
    return res.status(500).json({ errore: "Errore analisi immagine", dettaglio: session.error });
  }
});

export default router;

