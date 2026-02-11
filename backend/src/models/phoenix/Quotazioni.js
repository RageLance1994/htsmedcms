import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Data: { type: Date, required: true },
  "Codice Articolo": { type: String, required: false },
  Descrizione: { type: String, required: true },
  Fornitore: { type: String, required: true, maxlength: 100 },
  Costo: { type: Number, required: true },
  Valuta: { type: String, required: true, maxlength: 1 },
  Provenienza: { type: String, required: true, maxlength: 50 },
  Stato: { type: String, required: true, maxlength: 50 },
  "Eventuale Destinazione": { type: String, required: false, maxlength: 100 },
  Note: { type: String, required: false },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  cod: { type: Number, required: true }
},
{ collection: "Quotazioni", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Quotazioni", schema);
