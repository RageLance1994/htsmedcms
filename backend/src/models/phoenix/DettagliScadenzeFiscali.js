import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Pagata: { type: Boolean, required: true },
  Scadenza: { type: Date, required: true },
  Importo: { type: Number, required: true },
  Interessi: { type: Number, required: true },
  Totale: { type: Number, required: false },
  Contabile: { type: String, required: false, maxlength: 200 },
  Cod_banca: { type: Number, required: false },
  cod_scadenza: { type: Number, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Dettagli Scadenze Fiscali", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("DettagliScadenzeFiscali", schema);
