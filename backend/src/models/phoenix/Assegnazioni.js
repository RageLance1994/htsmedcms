import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Data: { type: Date, required: true },
  Protocollo: { type: String, required: false, maxlength: 64 },
  Destinatario: { type: String, required: true },
  Oggetto: { type: String, required: true },
  Corpo: { type: String, required: true },
  Cod_Azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  cod_utente: { type: Number, required: false }
},
{ collection: "Assegnazioni", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Assegnazioni", schema);
