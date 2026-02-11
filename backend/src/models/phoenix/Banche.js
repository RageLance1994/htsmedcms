import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Banca: { type: String, required: true, maxlength: 50 },
  Indirizzo: { type: String, required: true },
  IBAN: { type: String, required: true, maxlength: 50 },
  "N conto": { type: String, required: false },
  CAB: { type: String, required: false, maxlength: 50 },
  ABI: { type: String, required: false, maxlength: 50 },
  SWIFT: { type: String, required: false, maxlength: 50 },
  Note: { type: String, required: false },
  Cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Immagine: { type: Buffer, required: false },
  Attiva: { type: Boolean, required: false }
},
{ collection: "Banche", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Banche", schema);
