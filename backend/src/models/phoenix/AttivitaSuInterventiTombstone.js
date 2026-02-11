import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Cod: { type: Number, required: true },
  DeletionDate: { type: Date, required: false }
},
{ collection: "Attivita_su_Interventi_Tombstone", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("AttivitaSuInterventiTombstone", schema);
