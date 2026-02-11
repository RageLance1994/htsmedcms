import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Codice Articolo": { type: String, required: true, maxlength: 2 },
  Descrizione: { type: String, required: true },
  Seriale: { type: String, required: false, maxlength: 50 },
  "QT movimentata": { type: Number, required: false },
  Cod_DDT: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "VociDDT_FM", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("VociddtFm", schema);
