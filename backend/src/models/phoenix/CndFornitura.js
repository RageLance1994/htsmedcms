import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Tipo pagamento": { type: String, required: false, maxlength: 100 },
  Corpo: { type: String, required: false },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "cnd_fornitura", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CndFornitura", schema);
