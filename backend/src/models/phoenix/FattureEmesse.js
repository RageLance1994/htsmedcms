import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  Protocollo: { type: String, required: true, maxlength: 50 },
  Numero: { type: Number, required: true },
  Protocollo_Off_Prev: { type: String, required: true, maxlength: 30 },
  Oggetto: { type: String, required: false },
  "Descrizione Voci di Fatturazione": { type: String, required: false },
  Descrizione: { type: String, required: true },
  "TOTALE IMPONIBILE": { type: Number, required: true },
  TSconto: { type: Number, required: false },
  IVA: { type: Number, required: true },
  "TOTALE GENERALE": { type: Number, required: true },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Cod_Azienda: { type: Number, required: true },
  Cod_Contratto: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Note: { type: String, required: false },
  "Note Interne": { type: String, required: false },
  "Forma di Pagamento": { type: String, required: false },
  Pagamento: { type: String, required: false },
  cod: { type: Number, required: true },
  "N Fattura Padre": { type: String, required: false, maxlength: 50 },
  Anticipata: { type: Boolean, required: false },
  "Data Rientro": { type: Date, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Sospesa: { type: Boolean, required: false },
  Cod_idx: { type: Number, required: false },
  "Anticipata %": { type: Number, required: false },
  Inviata: { type: Boolean, required: false },
  "Data Invio": { type: Date, required: false },
  "Inviata da": { type: String, required: false, maxlength: 50 },
  XML: { type: String, required: false },
  cod_banca: { type: Number, required: false },
  cod_B2B: { type: Number, required: false },
  NomeFileXML: { type: String, required: false, maxlength: 50 },
  "Data Anticipazione": { type: Date, required: false },
  Cod_FT_Padre: { type: Number, required: false }
},
{ collection: "Fatture_Emesse", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("FattureEmesse", schema);
