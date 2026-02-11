import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  protocollo: { type: String, required: false, maxlength: 65 },
  data: { type: Date, required: true },
  stato: { type: String, required: true, maxlength: 20 },
  validato: { type: Boolean, required: true },
  note: { type: String, required: false },
  "validato il": { type: Date, required: false },
  validatore: { type: String, required: false, maxlength: 20 },
  Allegato: { type: Buffer, required: false },
  cod_preventivo: { type: Number, required: true },
  "Prot Offerta_Preventivo": { type: String, required: true, maxlength: 15 },
  "Fattura emessa": { type: Boolean, required: false },
  "Fattura Emessa il": { type: Date, required: false },
  "Protocollo Fattura": { type: String, required: false, maxlength: 15 },
  "Cod Azienda": { type: Number, required: true },
  Totale: { type: Number, required: false },
  Cod_Cliente: { type: Number, required: true },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "data fine": { type: Date, required: false },
  Nascosto: { type: Boolean, required: false },
  Cod_Commessa: { type: Number, required: false },
  Inviato: { type: Boolean, required: false },
  Perfezionato: { type: Boolean, required: false }
},
{ collection: "Contratti", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Contratti", schema);
