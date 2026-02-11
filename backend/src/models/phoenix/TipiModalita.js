import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Modalita: { type: String, required: true, maxlength: 50 },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Tipi Modalita", timestamps: false }
);

schema.index({ Modalita: 1 }, { unique: true });

export default mongoose.model("TipiModalita", schema);
