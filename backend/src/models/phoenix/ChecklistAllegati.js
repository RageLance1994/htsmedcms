import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Titolo: { type: String, required: true, maxlength: 50 },
  Allegato: { type: Buffer, required: false },
  Cod: { type: Number, required: true },
  Cod_Checklist: { type: Number, required: true },
  Progressivo: { type: Number, required: true },
  TipoFile: { type: String, required: false, maxlength: 5 }
},
{ collection: "CheckList Allegati", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("ChecklistAllegati", schema);
