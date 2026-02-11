import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  CDC: { type: String, required: true, maxlength: 50 },
  FATTURATO: { type: Number, required: true },
  UTILE_LORDO: { type: Number, required: true },
  UTILE_NETTO: { type: Number, required: true }
},
{ collection: "Tabella_Utili", timestamps: false }
);

export default mongoose.model("TabellaUtili", schema);
