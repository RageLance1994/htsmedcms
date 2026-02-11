import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Lavoro Svolto": { type: String, required: false },
  Esito: { type: String, required: false, maxlength: 300 },
  "Tecnico Riparatore": { type: String, required: false, maxlength: 200 },
  "Ore di lavoro": { type: Number, required: false },
  "Costo delle parti": { type: Number, required: false },
  "Parti Sostituite": { type: String, required: false },
  Note: { type: String, required: false },
  cod_riparazione: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Esito Riparazione", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("EsitoRiparazione", schema);
