import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod_utente: { type: Number, required: true },
  cod_gruppo: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Utenti Gruppo", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("UtentiGruppo", schema);
