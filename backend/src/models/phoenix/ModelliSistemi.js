import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Marca: { type: String, required: true, maxlength: 200 },
  Modello: { type: String, required: true, maxlength: 200 },
  Note: { type: String, required: false },
  "Totale Check": { type: Number, required: false },
  cod: { type: Number, required: true },
  Protocollo: { type: String, required: false, maxlength: 41 }
},
{ collection: "Modelli Sistemi", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ModelliSistemi", schema);
