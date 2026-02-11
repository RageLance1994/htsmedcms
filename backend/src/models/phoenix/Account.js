import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Descrizione: { type: String, required: false },
  "Nome Account": { type: String, required: true },
  "Idx Web": { type: String, required: false },
  Username: { type: String, required: true, maxlength: 50 },
  Password: { type: String, required: true },
  Pin: { type: String, required: false },
  Note: { type: String, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Account", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Account", schema);
