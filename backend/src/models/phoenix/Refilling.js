import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Livello Elio prima del refilling": { type: Number, required: true },
  "Livello elio dopo Refilling": { type: Number, required: true },
  "Litri Caricati": { type: Number, required: true },
  Fornitore: { type: String, required: false, maxlength: 100 },
  Note: { type: String, required: false },
  cod_verbale: { type: Number, required: true },
  cod_sistema: { type: Number, required: true },
  cod_utente: { type: Number, required: true },
  COD: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Refilling", timestamps: false }
);

schema.index({ COD: 1 }, { unique: true });

export default mongoose.model("Refilling", schema);
