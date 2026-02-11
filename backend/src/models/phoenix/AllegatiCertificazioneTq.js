import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Titolo: { type: String, required: true },
  Allegato: { type: Buffer, required: true },
  "Data Inserimento": { type: Date, required: true },
  cod_certificazione_TQ: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  ordine: { type: Number, required: false }
},
{ collection: "Allegati_Certificazione_TQ", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("AllegatiCertificazioneTq", schema);
