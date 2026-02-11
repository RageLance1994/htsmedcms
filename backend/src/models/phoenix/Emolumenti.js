import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Emolumenti: { type: Number, required: true },
  F24: { type: Number, required: true },
  Mese: { type: Number, required: true },
  Anno: { type: Number, required: true },
  "Centro di Costo": { type: String, required: true, maxlength: 100 },
  Cod_Utente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  "Data Inserimento": { type: Date, required: true },
  Cod: { type: Number, required: true }
},
{ collection: "Emolumenti", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("Emolumenti", schema);
