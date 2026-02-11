import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Tipo Documento": { type: String, required: true, maxlength: 50 },
  Allegato: { type: Buffer, required: true },
  cod: { type: Number, required: true },
  privato: { type: Boolean, required: false },
  Data: { type: Date, required: false },
  Note: { type: String, required: false },
  Descrizione: { type: String, required: false },
  User: { type: String, required: false, maxlength: 50 },
  cod_gruppo: { type: Number, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Tab_Allegati", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TabAllegati", schema);
