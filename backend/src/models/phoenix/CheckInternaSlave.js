import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Voce/Controllo": { type: String, required: false },
  cod: { type: Number, required: true },
  cod_ck_Master: { type: Number, required: true },
  Progressivo: { type: Number, required: false }
},
{ collection: "Check Interna SLAVE", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CheckInternaSlave", schema);
