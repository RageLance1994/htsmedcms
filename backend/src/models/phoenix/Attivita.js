import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Data Inizio": { type: Date, required: true },
  "Data Fine": { type: Date, required: false },
  protocollo: { type: String, required: false, maxlength: 50 },
  Descrizione: { type: String, required: true },
  Cliente: { type: String, required: true },
  Localita: { type: String, required: true },
  "Tipo evento": { type: String, required: true, maxlength: 50 },
  Note: { type: String, required: false },
  Ricorrenza: { type: Number, required: false },
  "Pre Avviso": { type: Number, required: false },
  "Centro di Costo": { type: String, required: true, maxlength: 50 },
  Cod_Cliente: { type: Number, required: true },
  Cod_Verbale: { type: Number, required: false },
  Cod_Utente: { type: Number, required: true },
  Cod_Azienda: { type: Number, required: true },
  Cod_sistema: { type: Number, required: false },
  "Visibile a Tutti": { type: Boolean, required: true },
  cod: { type: Number, required: true },
  "Associata a": { type: String, required: false },
  Cod_Attivita_Intervento: { type: Number, required: false },
  LastEditDate: { type: Date, required: false },
  CreationDate: { type: Date, required: false },
  "Totalmente Privata": { type: Boolean, required: false },
  cod_gruppo: { type: Number, required: false }
},
{ collection: "Attivita", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("Attivita", schema);
