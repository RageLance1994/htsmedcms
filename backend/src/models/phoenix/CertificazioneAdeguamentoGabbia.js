import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Validato: { type: Boolean, required: true },
  Data: { type: Date, required: true },
  Protocollo: { type: String, required: false, maxlength: 65 },
  "RELAZIONE TECNICA": { type: String, required: true },
  "SCHERMATURE DI CAMPO MAGNETICO": { type: String, required: false },
  "Dichiarazione di conformità": { type: String, required: true },
  Progressivo: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Cod_Sistema: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_Utente: { type: Number, required: true },
  Cod_Verifiche_Attenuazione: { type: Number, required: false },
  Cod: { type: Number, required: true },
  TimbroUtente: { type: Buffer, required: false },
  TimbroAzienda: { type: Buffer, required: false },
  FirmaUtente: { type: Buffer, required: false },
  FirmaPresidente: { type: Buffer, required: false },
  Inviato: { type: Boolean, required: false },
  "Data invio": { type: Date, required: false },
  SCM: { type: Boolean, required: false }
},
{ collection: "Certificazione Adeguamento Gabbia", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("CertificazioneAdeguamentoGabbia", schema);
