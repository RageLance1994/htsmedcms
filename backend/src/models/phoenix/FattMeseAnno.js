import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  MESE: { type: String, required: true, maxlength: 10 },
  IMPONIBILE_ANNO1: { type: Number, required: true },
  IMPONIBILE_ANNO2: { type: Number, required: true },
  IMPONIBILE_ANNO3: { type: Number, required: true },
  MESE_N: { type: Number, required: true },
  COD: { type: Number, required: true }
},
{ collection: "FATT_MESE_ANNO", timestamps: false }
);

schema.index({ COD: 1 }, { unique: true });

export default mongoose.model("FattMeseAnno", schema);
