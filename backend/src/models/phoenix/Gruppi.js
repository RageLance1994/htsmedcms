import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Nome Gruppo": { type: String, required: true, maxlength: 150 },
  cod: { type: Number, required: true },
  Note: { type: String, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Gruppi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Gruppi", schema);
