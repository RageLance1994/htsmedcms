import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  protocollo: { type: String, required: false, maxlength: 64 },
  data: { type: Date, required: true },
  oggetto: { type: String, required: true, maxlength: 150 },
  Descrizione: { type: String, required: true },
  Totale: { type: Number, required: true },
  note: { type: String, required: false },
  "Centro di Costo": { type: String, required: true },
  stato: { type: String, required: false, maxlength: 20 },
  validato: { type: Boolean, required: false },
  "validato il": { type: Date, required: false },
  validatore: { type: String, required: false, maxlength: 20 },
  "Condizioni di Fornitura": { type: String, required: true },
  "Clausole contrattuali": { type: String, required: false },
  Cod_Azienda: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Firma: { type: Buffer, required: false },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  CTRservice: { type: Boolean, required: false },
  "Generato da": { type: String, required: false, maxlength: 150 },
  Inviato: { type: Boolean, required: false },
  "Data Invio": { type: Date, required: false },
  "Inviato da": { type: String, required: false, maxlength: 50 },
  IVA: { type: Number, required: false },
  "Normativa IVA": { type: String, required: false },
  cod_banca: { type: Number, required: false },
  co: { type: String, required: false, maxlength: 100 },
  ClausoleGaranzia: { type: Boolean, required: false },
  Garanzia: { type: String, required: false }
},
{ collection: "Preventivi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Preventivi", schema);
