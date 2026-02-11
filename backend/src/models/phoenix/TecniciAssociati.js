import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Tecnico: { type: String, required: true },
  Cod_Attivita: { type: Number, required: true },
  cod: { type: Number, required: true },
  cod_utente: { type: Number, required: false }
},
{ collection: "Tecnici Associati", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("TecniciAssociati", schema);
