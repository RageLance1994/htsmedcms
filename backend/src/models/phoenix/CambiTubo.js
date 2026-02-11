import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Cod: { type: Number, required: true },
  Data: { type: Date, required: true },
  "Old Serial Number Anode": { type: String, required: true, maxlength: 20 },
  "Old Serial Number Housing": { type: String, required: true, maxlength: 20 },
  "New Serial Number Anode": { type: String, required: true, maxlength: 20 },
  "New Serial Number Housing": { type: String, required: true, maxlength: 20 },
  "Marca Old": { type: String, required: true, maxlength: 50 },
  "Modello Old": { type: String, required: true, maxlength: 50 },
  "Marca New": { type: String, required: true, maxlength: 50 },
  "Modello New": { type: String, required: true, maxlength: 50 },
  "Lettura Contatore": { type: Number, required: true },
  Nuovo: { type: Boolean, required: true },
  Note: { type: String, required: false },
  user: { type: String, required: true, maxlength: 20 },
  Cod_Utente: { type: Number, required: true },
  Cod_Sistema: { type: Number, required: true },
  Cod_Verbale: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Cambi_Tubo", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("CambiTubo", schema);
