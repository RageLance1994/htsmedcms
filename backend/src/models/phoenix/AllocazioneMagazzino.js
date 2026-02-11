import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod_articolo: { type: String, required: true, maxlength: 50 },
  Seriale: { type: String, required: false, maxlength: 50 },
  Scaffale: { type: String, required: true, maxlength: 20 },
  Riga: { type: String, required: true, maxlength: 20 },
  Colonna: { type: String, required: true, maxlength: 20 },
  Note: { type: String, required: false },
  cod_movimento: { type: Number, required: true },
  cod: { type: Number, required: true },
  Deposito: { type: Number, required: true }
},
{ collection: "Allocazione Magazzino", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("AllocazioneMagazzino", schema);
