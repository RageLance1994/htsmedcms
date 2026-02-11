import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Data: { type: Date, required: true },
  Cod_Causale: { type: Number, required: true },
  Cod_Articolo: { type: String, required: true, maxlength: 50 },
  "QT movimentata": { type: Number, required: true },
  "Part Number": { type: String, required: false, maxlength: 50 },
  "Costo di Acquisto": { type: Number, required: false },
  "Prezzo di Vendita": { type: Number, required: false },
  Cod_DDT: { type: Number, required: false },
  Note: { type: String, required: false },
  cod: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  cod_cliente: { type: Number, required: false },
  Riferimento: { type: String, required: false, maxlength: 100 },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  Cod_Allegato: { type: Number, required: false },
  Cod_Allegato_Foto: { type: Number, required: false },
  "Unità di Misura": { type: String, required: false, maxlength: 10 }
},
{ collection: "Movimenti di magazzino", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("MovimentiDiMagazzino", schema);
