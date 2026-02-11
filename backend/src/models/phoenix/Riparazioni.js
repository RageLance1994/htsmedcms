import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Protocollo: { type: String, required: false, maxlength: 64 },
  "Descrizione Parte": { type: String, required: true, maxlength: 200 },
  "Part Number": { type: String, required: false, maxlength: 100 },
  "Serial Number": { type: String, required: true, maxlength: 100 },
  Cliente: { type: String, required: true, maxlength: 200 },
  Sistema: { type: String, required: true, maxlength: 100 },
  "Descrizione Problema": { type: String, required: true },
  "Data Ingresso": { type: Date, required: true },
  "Data termine": { type: Date, required: false },
  Tecnico: { type: String, required: true, maxlength: 300 },
  "Priorità": { type: String, required: true, maxlength: 50 },
  "Stato lavoro": { type: String, required: true, maxlength: 50 },
  cod: { type: Number, required: true },
  Etichetta: { type: String, required: false, maxlength: 164 },
  cod_azienda: { type: Number, required: true },
  cod_allegato: { type: Number, required: false }
},
{ collection: "Riparazioni", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Riparazioni", schema);
