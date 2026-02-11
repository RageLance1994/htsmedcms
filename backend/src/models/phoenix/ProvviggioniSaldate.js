import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Imponibile Saldato": { type: Number, required: true },
  cod_provviggione: { type: Number, required: true },
  cod_fattura: { type: Number, required: true },
  "Data pagamento": { type: Date, required: true },
  cod: { type: Number, required: true },
  Note: { type: String, required: false },
  cod_fattura_ricevuta: { type: Number, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "Provviggioni Saldate", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ProvviggioniSaldate", schema);
