import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Validato: { type: Boolean, required: true },
  Data: { type: Date, required: true },
  Protocollo: { type: String, required: false, maxlength: 66 },
  "RELAZIONE TECNICA": { type: String, required: true },
  "Relazione Saldatura": { type: String, required: true },
  "Verifica Resistenza": { type: String, required: true },
  "Dichiarazione di conformità Impianto": { type: String, required: true },
  Progressivo: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_Utente: { type: Number, required: true },
  Cod: { type: Number, required: true },
  TimbroUtente: { type: Buffer, required: false },
  TimbroAzienda: { type: Buffer, required: false },
  FirmaUtente: { type: Buffer, required: false },
  FirmaPresidente: { type: Buffer, required: false },
  Sistema: { type: String, required: false, maxlength: 200 },
  Inviato: { type: Boolean, required: false },
  "Data Invio": { type: Date, required: false }
},
{ collection: "Certificazione Tubo Quench", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("CertificazioneTuboQuench", schema);
