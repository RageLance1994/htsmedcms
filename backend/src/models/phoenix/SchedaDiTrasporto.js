import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Vettore: { type: String, required: true },
  Committente: { type: String, required: true },
  Caricatore: { type: String, required: true },
  Proprietario: { type: String, required: true },
  "Eventuali Dichiarazioni": { type: String, required: false },
  "Dati Merce Trasportata": { type: String, required: true },
  "Osservazioni varie": { type: String, required: false },
  "Eventuali istruzioni": { type: String, required: false },
  Luogo: { type: String, required: true, maxlength: 50 },
  Data: { type: Date, required: true },
  Compilatore: { type: String, required: true },
  cod: { type: Number, required: true },
  Cod_DDT: { type: Number, required: true },
  "Luogo di Carico": { type: String, required: true, maxlength: 100 },
  "Luogo di Scarico": { type: String, required: true, maxlength: 100 }
},
{ collection: "Scheda di Trasporto", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("SchedaDiTrasporto", schema);
