import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  PIVA: { type: String, required: true, maxlength: 11 },
  N_Fattura: { type: String, required: true, maxlength: 50 },
  data: { type: Date, required: true },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "BlackList_FT_RC", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("BlacklistFtRc", schema);
