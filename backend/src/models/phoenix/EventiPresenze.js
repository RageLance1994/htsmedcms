import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Evento: { type: String, required: true, maxlength: 100 },
  "Data Inizio": { type: Date, required: true },
  "Data Fine": { type: Date, required: true },
  Autorizzato: { type: Boolean, required: true },
  "Autorizzato da": { type: String, required: false, maxlength: 200 },
  "Data Autorizzazione": { type: Date, required: false },
  cod_utente: { type: Number, required: true },
  cod: { type: Number, required: true },
  cod_azienda: { type: Number, required: false },
  cod_attivita: { type: Number, required: false },
  cod_cliente: { type: Number, required: false },
  "Descrizione Attività": { type: String, required: false, maxlength: 500 },
  OreMinuti: { type: String, required: true, maxlength: 27 }
},
{ collection: "Eventi Presenze", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("EventiPresenze", schema);
