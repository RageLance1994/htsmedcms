import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Descrizione: { type: String, required: true },
  Codice: { type: String, required: true, maxlength: 50 },
  QT: { type: Number, required: true },
  "Costo Unitario": { type: Number, required: true },
  Sconto: { type: Number, required: true },
  "Sub Totale": { type: Number, required: false },
  Cod_fattura: { type: Number, required: true },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Voci_Fattura", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("VociFattura", schema);
