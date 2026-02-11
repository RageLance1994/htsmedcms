import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  indirizzomail: { type: String, required: true },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "IndirizziMail", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Indirizzimail", schema);
