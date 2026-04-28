import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmed";
const SERVER_HEADERS_TIMEOUT_MS = Number.parseInt(process.env.SERVER_HEADERS_TIMEOUT_MS || "65000", 10);
const SERVER_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SERVER_REQUEST_TIMEOUT_MS || "70000", 10);
const SERVER_KEEPALIVE_TIMEOUT_MS = Number.parseInt(process.env.SERVER_KEEPALIVE_TIMEOUT_MS || "65000", 10);

process.on("unhandledRejection", (reason) => {
  console.error("[process/unhandledRejection]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[process/uncaughtException]", error);
});

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("Connesso a MongoDB");
    const server = app.listen(PORT, () => {
      console.log(`API in ascolto su http://localhost:${PORT}`);
    });
    server.headersTimeout = SERVER_HEADERS_TIMEOUT_MS;
    server.requestTimeout = SERVER_REQUEST_TIMEOUT_MS;
    server.keepAliveTimeout = SERVER_KEEPALIVE_TIMEOUT_MS;
  })
  .catch((error) => {
    console.error("Errore connessione MongoDB:", error.message);
    process.exit(1);
  });
