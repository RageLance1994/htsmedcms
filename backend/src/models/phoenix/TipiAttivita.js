import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Attivita: { type: String, required: true, maxlength: 50 },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Tipi Attivita", timestamps: false }
);

schema.index({ Attivita: 1 }, { unique: true });

export default mongoose.model("TipiAttivita", schema);
