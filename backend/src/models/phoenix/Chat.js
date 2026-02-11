import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Messaggio: { type: String, required: true },
  cod_mittente: { type: Number, required: true },
  "Inviat il": { type: Date, required: true },
  cod_dest: { type: Number, required: true },
  "letto il": { type: Date, required: false },
  letto: { type: Boolean, required: false },
  cod: { type: Number, required: true },
  Risposto: { type: Boolean, required: false },
  "Risposto il": { type: Date, required: false },
  "Risposto con": { type: Number, required: false }
},
{ collection: "Chat", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Chat", schema);
