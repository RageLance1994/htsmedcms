import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Percentuale: { type: Number, required: true },
  Cod_Utente: { type: Number, required: true },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Centri di Costo Personale", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CentriDiCostoPersonale", schema);
