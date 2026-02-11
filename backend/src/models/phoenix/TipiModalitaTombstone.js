import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Modalita: { type: String, required: true, maxlength: 50 },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Tipi Modalita_Tombstone", timestamps: false }
);

schema.index({ Modalita: 1 }, { unique: true });

export default mongoose.model("TipiModalitaTombstone", schema);
