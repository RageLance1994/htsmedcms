import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  COD: { type: Number, required: true },
  Tipo: { type: String, required: true, maxlength: 100 },
  Nominativo: { type: String, required: true },
  Indirizzo: { type: String, required: true },
  Citta: { type: String, required: true, maxlength: 50 },
  CAP: { type: String, required: true, maxlength: 50 },
  Provincia: { type: String, required: false, maxlength: 2 },
  Regione: { type: String, required: false, maxlength: 50 },
  "Agenzia di Riferimento": { type: String, required: false },
  Agenzia: { type: Boolean, required: false },
  telefoni: { type: String, required: false, maxlength: 100 },
  PIVA: { type: String, required: true, maxlength: 11 },
  "Cod Fiscale": { type: String, required: false, maxlength: 16 },
  Indirizzo1: { type: String, required: false },
  Citta1: { type: String, required: false, maxlength: 50 },
  CAP1: { type: String, required: false, maxlength: 5 },
  telefoni1: { type: String, required: false, maxlength: 100 },
  Banca: { type: String, required: false, maxlength: 20 },
  IBAN: { type: String, required: false, maxlength: 27 },
  Banca1: { type: String, required: false, maxlength: 50 },
  IBAN1: { type: String, required: false, maxlength: 27 },
  email1: { type: String, required: false },
  email2: { type: String, required: false, maxlength: 200 },
  email3: { type: String, required: false, maxlength: 50 },
  Note: { type: String, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Blocco: { type: Boolean, required: false },
  "Data di Blocco": { type: Date, required: false },
  Cod_idx_Prioritario: { type: Number, required: false },
  PEC: { type: String, required: false, maxlength: 100 },
  "Codice Identificativo": { type: String, required: false, maxlength: 50 },
  PR: { type: String, required: false, maxlength: 2 },
  Stato: { type: String, required: false, maxlength: 2 },
  cod_Azienda: { type: Number, required: false },
  "Tipo Cliente": { type: String, required: false, maxlength: 5 },
  "Mail Invio Verbali": { type: String, required: false, maxlength: 100 },
  ATECO: { type: String, required: false, maxlength: 50 },
  LogBook: { type: Boolean, required: false },
  user: { type: String, required: false, maxlength: 50 },
  password: { type: String, required: false, maxlength: 50 }
},
{ collection: "Cli_For", timestamps: false }
);

schema.index({ COD: 1 }, { unique: true });

export default mongoose.model("CliFor", schema);
