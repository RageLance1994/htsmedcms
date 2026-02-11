import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Codice Tributo": { type: String, required: false, maxlength: 15 },
  "Anno Riferimento": { type: Number, required: false },
  Importo: { type: Number, required: false },
  Cod_scadenza_fiscale: { type: Number, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Codici Tributi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CodiciTributi", schema);
