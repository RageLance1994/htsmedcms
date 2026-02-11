import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Versione: { type: String, required: true, maxlength: 15 },
  Info: { type: String, required: false },
  link: { type: String, required: true },
  data: { type: Date, required: true },
  cod: { type: Number, required: true },
  "Priorità Alta": { type: Boolean, required: false },
  online: { type: Boolean, required: false }
},
{ collection: "Aggiornamento", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Aggiornamento", schema);
