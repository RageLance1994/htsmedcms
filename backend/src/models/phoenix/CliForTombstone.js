import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  COD: { type: Number, required: true },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Cli_For_Tombstone", timestamps: false }
);

schema.index({ COD: 1 }, { unique: true });

export default mongoose.model("CliForTombstone", schema);
