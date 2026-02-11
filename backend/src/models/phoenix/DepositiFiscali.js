import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  Descrizione: { type: String, required: true, maxlength: 50 },
  Valorizza: { type: Boolean, required: true },
  Note: { type: String, required: false },
  Cod: { type: Number, required: true },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false }
},
{ collection: "Depositi_Fiscali", timestamps: false }
);

schema.index({ Cod: 1 }, { unique: true });

export default mongoose.model("DepositiFiscali", schema);
