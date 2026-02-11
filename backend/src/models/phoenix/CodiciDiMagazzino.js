import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Descrizione: { type: String, required: true },
  "Codice Articolo": { type: String, required: true, maxlength: 50 },
  "Costo Unitario": { type: Number, required: false },
  Tipo: { type: String, required: true, maxlength: 50 },
  Marca: { type: String, required: false, maxlength: 50 },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Valorizza: { type: Boolean, required: true },
  "Ammette Seriale": { type: Boolean, required: true },
  "Unità di Misura": { type: String, required: false, maxlength: 10 },
  Note: { type: String, required: false },
  "Costo di Acquisto": { type: Number, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "Part Number": { type: String, required: false, maxlength: 100 },
  "Vendor Code": { type: String, required: false, maxlength: 100 },
  "Alert Giacenza": { type: Boolean, required: false },
  "Giacenza Minina": { type: Number, required: false },
  Obsoleto: { type: Boolean, required: false }
},
{ collection: "Codici_di_magazzino", timestamps: false }
);

schema.index({ "Codice Articolo": 1 }, { unique: true });

export default mongoose.model("CodiciDiMagazzino", schema);
