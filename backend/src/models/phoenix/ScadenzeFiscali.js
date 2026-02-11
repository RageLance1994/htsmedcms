import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Tipologia: { type: String, required: true, maxlength: 50 },
  Importo: { type: Number, required: true },
  "Anno di Riferimento": { type: Number, required: true },
  Note: { type: String, required: false },
  codice_azienda: { type: Number, required: true },
  Scadenza: { type: Date, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Scadenze Fiscali", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ScadenzeFiscali", schema);
