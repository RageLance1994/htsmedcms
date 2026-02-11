import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Valore letto": { type: mongoose.Schema.Types.Decimal128, required: true },
  Descrizione: { type: String, required: false },
  Cod_Sistema: { type: Number, required: true },
  Cod: { type: Number, required: true },
  "Eseguita da": { type: String, required: true },
  Note: { type: String, required: false },
  Boiloff: { type: Number, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Letture Sistema", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("LettureSistema", schema);
