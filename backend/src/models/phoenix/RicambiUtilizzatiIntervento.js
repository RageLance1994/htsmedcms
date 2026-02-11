import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod: { type: Number, required: true },
  "Codice articolo": { type: String, required: false, maxlength: 50 },
  Descrizione: { type: String, required: true },
  QT: { type: Number, required: true },
  "Costo Unitario": { type: Number, required: true },
  "Sub Totale": { type: Number, required: false },
  Cod_Verbale: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Ricambi utilizzati Intervento", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("RicambiUtilizzatiIntervento", schema);
