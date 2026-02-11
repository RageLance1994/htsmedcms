import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Protocollo: { type: String, required: false, maxlength: 64 },
  "Rif Esterno": { type: String, required: true, maxlength: 100 },
  Oggetto: { type: String, required: true, maxlength: 100 },
  Descrizione: { type: String, required: true },
  data: { type: Date, required: true },
  Validato: { type: Boolean, required: true },
  Importo: { type: Number, required: true },
  iva: { type: Number, required: true },
  Totale: { type: Number, required: true },
  "Condizioni di pagamento": { type: String, required: false },
  Cod_Fattura_Ricevuta: { type: Number, required: false },
  cod_cliente: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  Cod_utente_validatore: { type: Number, required: false },
  cod: { type: Number, required: true },
  Allegato: { type: Buffer, required: false },
  Valuta: { type: String, required: false, maxlength: 5 }
},
{ collection: "Ordini", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Ordini", schema);
