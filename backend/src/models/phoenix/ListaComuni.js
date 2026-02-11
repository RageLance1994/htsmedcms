import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Comune: { type: String, required: false, maxlength: 50 },
  Provincia: { type: String, required: false, maxlength: 2 },
  Regione: { type: String, required: false, maxlength: 50 },
  Prefisso: { type: String, required: false, maxlength: 5 },
  CAP: { type: String, required: false, maxlength: 5 },
  Abitanti: { type: mongoose.Schema.Types.Decimal128, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Lista Comuni", timestamps: false }
);

export default mongoose.model("ListaComuni", schema);
