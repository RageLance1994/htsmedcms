import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod_utente: { type: Number, required: true },
  Cod_attivita: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  Importo: { type: Number, required: true },
  Documento: { type: String, required: true, maxlength: 50 },
  Pagamento: { type: String, required: true, maxlength: 50 },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Note: { type: String, required: false },
  "Da Rimborsare": { type: Boolean, required: true },
  Rimborsato: { type: Boolean, required: false },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Validato: { type: Boolean, required: false },
  "Validato da": { type: String, required: false, maxlength: 50 },
  "Validato il": { type: Date, required: false },
  Km: { type: Number, required: false },
  Causale: { type: String, required: false, maxlength: 200 },
  Fornitore: { type: String, required: false, maxlength: 200 },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Nota Spese", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("NotaSpese", schema);
