import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  ANNO: { type: Number, required: true },
  SETTIMANA: { type: Number, required: true },
  "Data Inizio": { type: Date, required: true },
  "Data Fine": { type: Date, required: true },
  Cliente: { type: String, required: true, maxlength: 250 },
  Descrizione: { type: String, required: true, maxlength: 250 },
  Localita: { type: String, required: true, maxlength: 250 },
  "Associata a": { type: String, required: true, maxlength: 250 },
  Mail: { type: String, required: true, maxlength: 100 },
  cod_azienda: { type: Number, required: true },
  cod_attivita: { type: Number, required: true },
  cod_cliente: { type: Number, required: true },
  cod_utente: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Planning", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Planning", schema);
