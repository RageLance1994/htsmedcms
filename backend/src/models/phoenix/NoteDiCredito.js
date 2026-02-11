import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Protocollo: { type: String, required: true, maxlength: 50 },
  "Data Emissione": { type: Date, required: true },
  Progressivo: { type: Number, required: true },
  "Anno di Riferimento": { type: Number, required: true },
  Intestatario: { type: String, required: true },
  Corpo: { type: String, required: true },
  Imponibile: { type: Number, required: true },
  iva: { type: Number, required: true },
  Totale: { type: Number, required: false },
  cod_Cliente: { type: Number, required: true },
  cod_Azienda: { type: Number, required: true },
  cod_fattura: { type: Number, required: true },
  cod: { type: Number, required: true },
  XML: { type: String, required: false }
},
{ collection: "Note di Credito", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("NoteDiCredito", schema);
