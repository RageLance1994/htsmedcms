import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Verifica: { type: String, required: true, maxlength: 250 },
  Esito: { type: String, required: true, maxlength: 50 },
  Note: { type: String, required: false },
  "Numero Check": { type: Number, required: true },
  cod_modello: { type: Number, required: true },
  Sottosistema: { type: String, required: false, maxlength: 150 },
  cod: { type: Number, required: true },
  cod_sistema: { type: Number, required: true },
  Data: { type: Date, required: true },
  cod_utente: { type: Number, required: true },
  cod_verbale: { type: Number, required: true },
  cod_allegato: { type: Number, required: false }
},
{ collection: "CheckList Sistema", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("ChecklistSistema", schema);
