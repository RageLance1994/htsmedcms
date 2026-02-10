import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmedcms";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connesso a MongoDB");
    app.listen(PORT, () => {
      console.log(`API in ascolto su http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Errore connessione MongoDB:", error.message);
    process.exit(1);
  });
