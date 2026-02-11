import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Titolo: { type: String, required: true, maxlength: 100 },
  Allegato: { type: Buffer, required: true },
  ordine: { type: Number, required: true },
  cod_articolo: { type: String, required: true, maxlength: 50 },
  cod_azienda: { type: Number, required: true },
  cod: { type: Number, required: true },
  Dimensione: { type: Number, required: false }
},
{ collection: "Allegati_Articolo", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("AllegatiArticolo", schema);
