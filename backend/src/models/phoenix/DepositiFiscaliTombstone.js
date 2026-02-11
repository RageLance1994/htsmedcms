import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Cod: { type: Number, required: true },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Depositi_Fiscali_Tombstone", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("DepositiFiscaliTombstone", schema);
