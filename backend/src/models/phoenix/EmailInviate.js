import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  da: { type: String, required: true, maxlength: 100 },
  a: { type: String, required: true },
  cc: { type: String, required: false },
  ccn: { type: String, required: false, maxlength: 100 },
  oggetto: { type: String, required: true, maxlength: 500 },
  corpo: { type: String, required: true },
  allegati: { type: String, required: true },
  user: { type: String, required: true, maxlength: 100 },
  passsword: { type: String, required: true, maxlength: 100 },
  inviata: { type: Boolean, required: true },
  "data invio": { type: Date, required: true },
  "ultimo messaggio": { type: String, required: true },
  cod_utente: { type: Number, required: true },
  cod: { type: Number, required: true },
  Path: { type: String, required: false }
},
{ collection: "Email Inviate", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("EmailInviate", schema);
