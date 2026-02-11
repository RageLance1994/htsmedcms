import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Data Taratura": { type: Date, required: true },
  "Data Scadenza": { type: Date, required: true },
  "Centro Taratura": { type: String, required: true, maxlength: 100 },
  Accreditato: { type: String, required: true, maxlength: 100 },
  Note: { type: String, required: false },
  cod_strumentazione: { type: Number, required: true },
  cod_allegato: { type: Number, required: false },
  cod: { type: Number, required: true },
  "Data Registrazione": { type: Date, required: true }
},
{ collection: "Tarature Strumentazione", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TaratureStrumentazione", schema);
