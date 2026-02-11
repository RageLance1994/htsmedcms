import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Data: { type: Date, required: true },
  Protocollo: { type: String, required: false, maxlength: 64 },
  Destinatario: { type: String, required: true },
  Oggetto: { type: String, required: true },
  Corpo: { type: String, required: true },
  "Firma Lettera": { type: Buffer, required: false },
  cod_azienda: { type: Number, required: true },
  cod_cliente: { type: Number, required: true },
  cod: { type: Number, required: true },
  Validato: { type: Boolean, required: false },
  Inviato: { type: Boolean, required: false },
  cod_allegato: { type: Number, required: false },
  cod_gruppo: { type: Number, required: false },
  Utente: { type: String, required: false, maxlength: 100 }
},
{ collection: "Lettere", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Lettere", schema);
