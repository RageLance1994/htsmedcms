import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Marca: { type: String, required: true, maxlength: 50 },
  Modello: { type: String, required: true, maxlength: 100 },
  "Part Number": { type: String, required: false, maxlength: 50 },
  "Serial Number": { type: String, required: true, maxlength: 50 },
  Descrizione: { type: String, required: false },
  MFG: { type: Date, required: false },
  "Data Acquisto": { type: Date, required: false },
  Stato: { type: String, required: false, maxlength: 50 },
  cod_maga: { type: Number, required: false },
  Cod_Allegato: { type: Number, required: false },
  Cod_Azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  Note: { type: String, required: false }
},
{ collection: "Strumentazione", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Strumentazione", schema);
