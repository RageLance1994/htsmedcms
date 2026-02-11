import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Tipo Offerta": { type: String, required: true, maxlength: 50 },
  Condizioni: { type: String, required: true },
  cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  cod_azienda: { type: Number, required: false }
},
{ collection: "cnd_contrattuali", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CndContrattuali", schema);
