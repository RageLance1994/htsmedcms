import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Modello Sistema": { type: String, required: true, maxlength: 50 },
  cod: { type: Number, required: true },
  cod_azienda: { type: Number, required: true }
},
{ collection: "Check Interna MASTER", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CheckInternaMaster", schema);
