import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Nome: { type: String, required: true, maxlength: 100 },
  idxMail: { type: String, required: true, maxlength: 100 },
  Notify1: { type: Boolean, required: false },
  Notify2: { type: Boolean, required: false },
  Notify3: { type: Boolean, required: false },
  Notify4: { type: Boolean, required: false },
  Notify5: { type: Boolean, required: false },
  cod: { type: Number, required: true }
},
{ collection: "LiveNotify", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Livenotify", schema);
