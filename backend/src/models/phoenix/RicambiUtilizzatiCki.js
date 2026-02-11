import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "codice articolo": { type: String, required: true, maxlength: 50 },
  QT: { type: Number, required: true },
  Note: { type: String, required: false },
  cod_check_interna: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Ricambi Utilizzati CKi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("RicambiUtilizzatiCki", schema);
