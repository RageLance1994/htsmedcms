import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Codice Articolo": { type: String, required: true, maxlength: 50 },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Codici_di_magazzino_Tombstone", timestamps: false }
);

schema.index({ "Codice Articolo": 1 }, { unique: true });

export default mongoose.model("CodiciDiMagazzinoTombstone", schema);
