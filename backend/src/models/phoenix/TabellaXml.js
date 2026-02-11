import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Tipo Documento": { type: String, required: false, maxlength: 50 },
  XML: { type: String, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Tabella XML", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TabellaXml", schema);
