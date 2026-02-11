import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Tipologia Sede": { type: String, required: true },
  Indirizzo: { type: String, required: true },
  CAP: { type: String, required: false, maxlength: 5 },
  "Città": { type: String, required: true, maxlength: 50 },
  PIVA: { type: String, required: false, maxlength: 11 },
  Note: { type: String, required: false },
  "Idx Prioritario": { type: Boolean, required: false },
  attivo: { type: Boolean, required: true },
  cod_cliente: { type: Number, required: true },
  "Data Inserimento": { type: Date, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Tabella Indirizzi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TabellaIndirizzi", schema);
