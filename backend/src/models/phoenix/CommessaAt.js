import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  TimeStamp: { type: Date, required: true },
  Voce: { type: String, required: true },
  "Data Inizio": { type: Date, required: true },
  "Data Fine": { type: Date, required: true },
  Check: { type: Boolean, required: false },
  Note: { type: String, required: false },
  cod_commessa: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Commessa_AT", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CommessaAt", schema);
