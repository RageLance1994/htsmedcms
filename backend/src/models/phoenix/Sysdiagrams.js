import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  name: { type: String, required: true, maxlength: 128 },
  principal_id: { type: Number, required: true },
  diagram_id: { type: Number, required: true },
  version: { type: Number, required: false },
  definition: { type: Buffer, required: false }
},
{ collection: "sysdiagrams", timestamps: false }
);

schema.index({ diagram_id: 1 }, { unique: true });

export default mongoose.model("Sysdiagrams", schema);
