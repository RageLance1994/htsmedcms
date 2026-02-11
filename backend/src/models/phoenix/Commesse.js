import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Data: { type: Date, required: true },
  Protocollo: { type: String, required: false, maxlength: 64 },
  "Protocollo Contratto": { type: String, required: true, maxlength: 65 },
  "Protocollo Offerta": { type: String, required: true, maxlength: 65 },
  "Stato Commessa": { type: String, required: true, maxlength: 20 },
  Note: { type: String, required: false },
  Cod_Contratto: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Cod_Preventivo: { type: Number, required: true },
  Cod_Collaudo: { type: Number, required: false },
  Cod_Azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  Validazione_PO: { type: Boolean, required: false },
  Validazione_UA: { type: Boolean, required: false },
  Validazione_AT: { type: Boolean, required: false }
},
{ collection: "Commesse", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Commesse", schema);
