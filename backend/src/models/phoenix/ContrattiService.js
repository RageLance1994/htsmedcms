import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Protocollo: { type: String, required: false, maxlength: 65 },
  TipoCTR: { type: String, required: true },
  "Data Inizio": { type: Date, required: true },
  "Data Termine": { type: Date, required: true },
  Stato: { type: String, required: true, maxlength: 50 },
  Note: { type: String, required: false },
  cod_sistema: { type: Number, required: true },
  cod_cliente: { type: Number, required: true },
  cod_contratto: { type: Number, required: true },
  cod_offerta: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  Tipologia: { type: String, required: false, maxlength: 50 }
},
{ collection: "Contratti Service", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ContrattiService", schema);
