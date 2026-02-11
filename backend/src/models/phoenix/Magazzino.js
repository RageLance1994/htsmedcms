import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Codice articolo": { type: String, required: true, maxlength: 50 },
  "Giacenza Fisica": { type: Number, required: true },
  "Giacenza Fiscale": { type: Number, required: true },
  "Deposito Fiscale": { type: Number, required: true },
  "Seriale Number": { type: String, required: false, maxlength: 20 },
  "Part Number": { type: String, required: false, maxlength: 50 },
  "Matricola Interna": { type: Number, required: false },
  "Costo di Acquisto": { type: Number, required: false },
  "Prezzo di Vendita": { type: Number, required: false },
  Note: { type: String, required: false },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Magazzino", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("Magazzino", schema);
