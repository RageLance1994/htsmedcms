import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Data Lettura": { type: Date, required: true },
  "Lettura Contatore": { type: mongoose.Schema.Types.Decimal128, required: true },
  Note: { type: String, required: false },
  cod_sistema: { type: Number, required: true },
  cod_verbale: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Letture Compressore", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("LettureCompressore", schema);
