import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Cod: { type: Number, required: true },
  Cod_Cli: { type: Number, required: true },
  Modalita: { type: String, required: true, maxlength: 15 },
  Marca: { type: String, required: true, maxlength: 15 },
  Modello: { type: String, required: true, maxlength: 50 },
  "N Sistema": { type: String, required: false, maxlength: 96 },
  "Installato presso": { type: String, required: true },
  "Serial Number": { type: String, required: true, maxlength: 50 },
  km: { type: Number, required: false },
  "Contatore Generale": { type: Number, required: false },
  "Contatore al cambio Tubo": { type: Number, required: false },
  "Data Lettura": { type: Date, required: false },
  "Colpi eseguiti": { type: Number, required: false },
  "Opzioni Installate": { type: String, required: false },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  "In Assistenza": { type: Boolean, required: false },
  "Tipo Assistenza": { type: String, required: false },
  "Scadenza Assistenza": { type: Date, required: false },
  "Tipo Contatore": { type: String, required: false, maxlength: 50 },
  "Anode sn": { type: String, required: false, maxlength: 50 },
  "Housing sn": { type: String, required: false, maxlength: 50 },
  MarcaTubo: { type: String, required: false, maxlength: 50 },
  ModelloTubo: { type: String, required: false, maxlength: 50 },
  "Tubo installato il": { type: Date, required: false },
  Cod_CTR: { type: Number, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Sistemi", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("Sistemi", schema);
