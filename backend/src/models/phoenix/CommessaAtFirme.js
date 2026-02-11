import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Nome Operatore": { type: String, required: true, maxlength: 100 },
  Firma: { type: Buffer, required: true },
  Data: { type: Date, required: true },
  cod: { type: Number, required: true },
  cod_commessa: { type: Number, required: true },
  note: { type: String, required: false }
},
{ collection: "Commessa_AT_Firme", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CommessaAtFirme", schema);
