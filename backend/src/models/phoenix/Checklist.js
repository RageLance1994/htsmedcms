import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Modello: { type: String, required: true, maxlength: 50 },
  Marca: { type: String, required: true, maxlength: 50 },
  "N Check List": { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "CheckList", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Checklist", schema);
