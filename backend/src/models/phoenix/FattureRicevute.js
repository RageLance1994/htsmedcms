import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Numero fattura": { type: String, required: true, maxlength: 50 },
  "Ns Riferimento": { type: String, required: false, maxlength: 100 },
  Fornitore: { type: String, required: true },
  "partita IVA": { type: String, required: false, maxlength: 11 },
  Descrizione: { type: String, required: true },
  Imponibile: { type: Number, required: true },
  iva: { type: Number, required: false },
  Totale: { type: Number, required: false },
  pagamento: { type: String, required: false },
  pagata: { type: Boolean, required: false },
  "cento di costo": { type: String, required: true, maxlength: 50 },
  note: { type: String, required: false },
  cod: { type: Number, required: true },
  Cod_azienda: { type: Number, required: true },
  Cod_Fornitore: { type: Number, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Cod_Allegato: { type: Number, required: false },
  "Destinazione Fiscale": { type: String, required: false, maxlength: 50 },
  cod_utente: { type: Number, required: false },
  Cod_Ordine: { type: Number, required: false },
  Cod_Cliente: { type: Number, required: false },
  "data trasferimento": { type: Date, required: false },
  Varie: { type: String, required: false },
  XML: { type: String, required: false },
  NomeFileXML: { type: String, required: false, maxlength: 50 },
  "N. Allegati": { type: Number, required: false }
},
{ collection: "Fatture Ricevute", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("FattureRicevute", schema);
