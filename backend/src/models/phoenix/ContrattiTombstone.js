import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod: { type: Number, required: true },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Contratti_Tombstone", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ContrattiTombstone", schema);
