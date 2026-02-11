import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Data di stampa": { type: Date, required: false },
  "Data Richiesta": { type: Date, required: true },
  "Data Verbale": { type: Date, required: false },
  "Data Chiusura": { type: Date, required: false },
  "Data System UP": { type: Date, required: false },
  "N Verbale": { type: String, required: false, maxlength: 112 },
  Causale: { type: String, required: true, maxlength: 100 },
  "Tipo Richiesta": { type: String, required: true, maxlength: 100 },
  Stato: { type: String, required: true, maxlength: 50 },
  "Descrizione Lavoro": { type: String, required: true },
  "Note Interne": { type: String, required: false },
  "N Sistema": { type: String, required: true, maxlength: 50 },
  Cod_Sistema: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_Utente_Rif: { type: Number, required: true },
  Cod_Intervento: { type: Number, required: true },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Firma: { type: Buffer, required: false },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "Tipo Intervento": { type: String, required: false, maxlength: 50 },
  Cod_allegato: { type: Number, required: false },
  "Consuntivo Emesso": { type: Boolean, required: false },
  "Protocollo Consuntivo": { type: String, required: false, maxlength: 50 },
  "Data Consuntivo": { type: Date, required: false },
  Inviato: { type: Boolean, required: false }
},
{ collection: "Verbali", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("Verbali", schema);
