import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Attività Svolta": { type: String, required: true },
  Utente: { type: String, required: true, maxlength: 100 },
  "Ver Phoenix": { type: String, required: true, maxlength: 50 },
  cod: { type: Number, required: true },
  cod_azienda: { type: Number, required: false }
},
{ collection: "LOG", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Log", schema);
