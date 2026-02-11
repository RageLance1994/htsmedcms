import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod: { type: Number, required: true },
  Cod_fattura_R: { type: Number, required: true },
  Descrizione: { type: String, required: false, maxlength: 50 },
  Scadenza: { type: Date, required: true },
  Importo: { type: Number, required: true },
  Pagata: { type: Boolean, required: true },
  contabile: { type: String, required: false },
  Prot_fattura: { type: String, required: false, maxlength: 50 },
  Cod_Azienda: { type: Number, required: true },
  Cod_Cliente: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Scadenze_Fatture_Ricevute", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ScadenzeFattureRicevute", schema);
