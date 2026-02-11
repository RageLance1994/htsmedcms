import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "N Assegno": { type: String, required: true, maxlength: 50 },
  Banca: { type: String, required: true, maxlength: 50 },
  Scadenza: { type: Date, required: true },
  Incassato: { type: Boolean, required: false },
  "Data Incasso": { type: Date, required: false },
  Note: { type: String, required: false },
  cod_cliente: { type: Number, required: true },
  cod_PO: { type: Number, required: false },
  cod_FT_RC: { type: Number, required: false },
  cod_allegato: { type: Number, required: false },
  cod_Azienda: { type: Number, required: true },
  Importo: { type: Number, required: true },
  COD: { type: Number, required: true }
},
{ collection: "Lista Assegni Emessi", timestamps: false }
);

schema.index({ COD: 1 }, { unique: true });

export default mongoose.model("ListaAssegniEmessi", schema);
