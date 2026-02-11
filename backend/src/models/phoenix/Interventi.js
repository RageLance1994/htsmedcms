import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Cliente: { type: String, required: false },
  "Data Richiesta": { type: Date, required: true },
  "Data Verbale": { type: Date, required: false },
  "Data Chiusura": { type: Date, required: false },
  "Data System UP": { type: Date, required: false },
  Causale: { type: String, required: true, maxlength: 100 },
  "Tipo Richiesta": { type: String, required: true, maxlength: 100 },
  Stato: { type: String, required: true, maxlength: 50 },
  "Descrizione Lavoro": { type: String, required: true },
  "Note Interne": { type: String, required: false },
  Fatturare: { type: Boolean, required: false },
  "N Sistema": { type: String, required: true, maxlength: 50 },
  Cod_Sistema: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_Utente_Rif: { type: Number, required: true },
  Cod_Contratto: { type: Number, required: false },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Cod_Attivita: { type: Number, required: true },
  Firma: { type: Buffer, required: false },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Protocollo: { type: String, required: false, maxlength: 34 }
},
{ collection: "Interventi", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("Interventi", schema);
