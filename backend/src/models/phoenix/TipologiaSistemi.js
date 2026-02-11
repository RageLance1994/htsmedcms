import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Marca: { type: String, required: true, maxlength: 50 },
  Modello: { type: String, required: true, maxlength: 50 },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  Modalita: { type: String, required: true, maxlength: 5 }
},
{ collection: "Tipologia Sistemi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TipologiaSistemi", schema);
