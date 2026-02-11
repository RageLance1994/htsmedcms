import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod_agenzia: { type: Number, required: true },
  cod_cliente: { type: Number, required: true },
  cod_fattura: { type: Number, required: true },
  "Percentuale Provviggione": { type: Number, required: true },
  cod: { type: Number, required: true },
  Note: { type: String, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Provvigioni", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Provvigioni", schema);
