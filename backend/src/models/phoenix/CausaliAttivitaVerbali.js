import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Attivita: { type: String, required: true, maxlength: 100 },
  cod: { type: Number, required: true }
},
{ collection: "Causali Attivita Verbali", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CausaliAttivitaVerbali", schema);
