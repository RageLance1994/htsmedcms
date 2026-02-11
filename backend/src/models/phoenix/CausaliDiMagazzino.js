import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Descrizione Movimento": { type: String, required: true, maxlength: 100 },
  "Deposito Iniziale": { type: Number, required: true },
  "Deposito Finale": { type: Number, required: true },
  "Azione su Giacenza Fisica": { type: Number, required: true },
  "Azione su Giacenza Fiscale": { type: Number, required: true },
  Note: { type: String, required: false },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "Valido per DDT": { type: Boolean, required: false },
  Nascondi: { type: Boolean, required: false }
},
{ collection: "Causali di magazzino", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CausaliDiMagazzino", schema);
