import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Codice identificativo": { type: String, required: false, maxlength: 7 },
  PEC: { type: String, required: false, maxlength: 50 },
  Descrizione: { type: String, required: false, maxlength: 150 },
  cod_cliente: { type: Number, required: false },
  cod: { type: Number, required: true }
},
{ collection: "Codici ID P2P_PA", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CodiciIdP2pPa", schema);
