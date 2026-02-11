import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Verifica: { type: String, required: true, maxlength: 250 },
  Esito: { type: String, required: false, maxlength: 10 },
  Note: { type: String, required: false },
  "Numero Check": { type: Number, required: true },
  cod_modello: { type: Number, required: true },
  Sottosistema: { type: String, required: false, maxlength: 150 },
  cod: { type: Number, required: true }
},
{ collection: "CheckList Master", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ChecklistMaster", schema);
