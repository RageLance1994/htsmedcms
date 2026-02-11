import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Centri di Costo_Tombstone", timestamps: false }
);

schema.index({ "Centro di Costo": 1 }, { unique: true });

export default mongoose.model("CentriDiCostoTombstone", schema);
