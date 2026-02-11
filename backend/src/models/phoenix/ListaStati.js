import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Stato: { type: String, required: false, maxlength: 50 },
  "GENC 2A Code": { type: String, required: false, maxlength: 50 },
  "GENC 3A Code ": { type: String, required: false, maxlength: 50 },
  Capitale: { type: String, required: false, maxlength: 50 },
  cod: { type: Number, required: true }
},
{ collection: "Lista Stati", timestamps: false }
);

export default mongoose.model("ListaStati", schema);
