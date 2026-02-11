import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod: { type: Number, required: true },
  Cod_fattura: { type: Number, required: true },
  Descrizione: { type: String, required: false, maxlength: 50 },
  Scadenza: { type: Date, required: true },
  Importo: { type: Number, required: true },
  Pagata: { type: Boolean, required: true },
  contabile: { type: String, required: false },
  Prot_fattura: { type: String, required: false, maxlength: 50 },
  Fattura_Emessa: { type: Boolean, required: false },
  Cod_Azienda: { type: Number, required: false },
  Cod_Cliente: { type: Number, required: false },
  N_Fattura_Padre: { type: String, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "Data Effettiva Pagamento": { type: Date, required: false },
  "Scadenza Pagamento": { type: Date, required: false },
  PdiR: { type: Boolean, required: false },
  "Note PdiR": { type: String, required: false },
  Cod_FT_Padre: { type: Number, required: false }
},
{ collection: "Scadenze_Fatture_Emesse", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ScadenzeFattureEmesse", schema);
