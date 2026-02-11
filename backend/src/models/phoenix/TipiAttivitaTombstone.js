import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Attivita: { type: String, required: true, maxlength: 50 },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Tipi Attivita_Tombstone", timestamps: false }
);

schema.index({ Attivita: 1 }, { unique: true });

export default mongoose.model("TipiAttivitaTombstone", schema);
