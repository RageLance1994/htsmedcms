import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod_movimento: { type: Number, required: true },
  cod: { type: Number, required: true },
  Cod_DDT: { type: Number, required: true }
},
{ collection: "DDT Movimenti", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("DdtMovimenti", schema);
