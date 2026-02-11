import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  cod: { type: Number, required: true },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Causali di magazzino_Tombstone", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CausaliDiMagazzinoTombstone", schema);
