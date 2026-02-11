import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Inizio Ore": { type: String, required: true, maxlength: 10 },
  "Fine Ore": { type: String, required: true, maxlength: 10 },
  Tecnico: { type: String, required: true },
  Causale: { type: String, required: true, maxlength: 50 },
  km: { type: Number, required: true },
  Cod_Utente: { type: Number, required: true },
  Cod_Verbale: { type: Number, required: true },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "data fine": { type: Date, required: false }
},
{ collection: "Attivita_su_Interventi", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("AttivitaSuInterventi", schema);
