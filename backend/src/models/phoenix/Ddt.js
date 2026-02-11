import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  cod: { type: Number, required: true },
  "N DDT": { type: String, required: false, maxlength: 100 },
  Cod_Cliente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_Causale: { type: Number, required: false },
  "Indirizzo destinazione": { type: String, required: true },
  "Trasporto a mezzo": { type: String, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Progressivo: { type: Number, required: false },
  Note: { type: String, required: false },
  Cod_Allegato: { type: Number, required: false },
  Note2: { type: String, required: false, maxlength: 120 }
},
{ collection: "DDT", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Ddt", schema);
