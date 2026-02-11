import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Voce/Controllo": { type: String, required: true },
  Esito: { type: Boolean, required: false },
  Note: { type: String, required: false },
  cod_checklist: { type: Number, required: true },
  cod: { type: Number, required: true },
  Progressivo: { type: Number, required: false }
},
{ collection: "Check List Interna Dettagli", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CheckListInternaDettagli", schema);
