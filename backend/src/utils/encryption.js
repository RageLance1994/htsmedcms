import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey() {
  if (!process.env.USER_SECRET) {
    throw new Error("USER_SECRET mancante nelle variabili d'ambiente");
  }
  return crypto.scryptSync(process.env.USER_SECRET, "salt", 32);
}

export function encryptJSON(obj) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const json = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptJSON(hash) {
  const buf = Buffer.from(hash, "base64");
  const iv = buf.slice(0, 16);
  const tag = buf.slice(16, 32);
  const encrypted = buf.slice(32);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function encryptString(str) {
  return encryptJSON({ v: str });
}

export function decryptString(hash) {
  return decryptJSON(hash).v;
}

export function hashString(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
