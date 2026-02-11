import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  Valuta: { type: Date, required: false },
  "Descrizione Movimento": { type: String, required: true },
  Causale: { type: String, required: false, maxlength: 200 },
  Nominativo: { type: String, required: false, maxlength: 200 },
  Importo: { type: Number, required: true },
  Divisa: { type: String, required: false, maxlength: 10 },
  note: { type: String, required: false },
  cod_banca: { type: Number, required: true },
  cod: { type: Number, required: true },
  Importato: { type: Boolean, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Movimenti Bancari", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("MovimentiBancari", schema);
