import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Titolo: { type: String, required: true },
  Allegato: { type: Buffer, required: true },
  "Tipo Documento": { type: String, required: true, maxlength: 50 },
  "Data Inserimento": { type: Date, required: true },
  cod_utente: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true }
},
{ collection: "Allegati_Utente", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("AllegatiUtente", schema);
