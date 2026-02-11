import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Protocollo: { type: String, required: false, maxlength: 64 },
  Data: { type: Date, required: false },
  Specifica: { type: String, required: false },
  Cod_Offerta: { type: Number, required: false },
  Cod_cliente: { type: Number, required: false },
  Cod_Azienda: { type: Number, required: false },
  cod: { type: Number, required: true },
  Cod_Sistema: { type: Number, required: false },
  Cod_CTR: { type: Number, required: false },
  cod_allegato: { type: Number, required: false },
  Intestazione: { type: String, required: false },
  PiePagina: { type: String, required: false }
},
{ collection: "Collaudi", timestamps: false }
);

export default mongoose.model("Collaudi", schema);
