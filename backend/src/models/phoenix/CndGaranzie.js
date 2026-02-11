import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Garanzie: { type: String, required: true },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "cnd_garanzie", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CndGaranzie", schema);
