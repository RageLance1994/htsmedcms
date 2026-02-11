import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Descrizione: { type: String, required: false, maxlength: 50 },
  Altro: { type: String, required: false, maxlength: 50 },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Centri di Costo", timestamps: false }
);

schema.index({ "Centro di Costo": 1 }, { unique: true });

export default mongoose.model("CentriDiCosto", schema);
