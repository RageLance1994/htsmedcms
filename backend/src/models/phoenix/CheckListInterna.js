import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  "Data Inizio Check List": { type: Date, required: true },
  "Data Termine Check": { type: Date, required: false },
  "Modello Sistema": { type: String, required: true },
  "S/N": { type: String, required: true, maxlength: 50 },
  "Accessori a Corredo": { type: String, required: false },
  "Dettagli Tubo e altro": { type: String, required: false },
  "Conforme all'ordine": { type: Boolean, required: false },
  "Difformità Eventuali": { type: String, required: false },
  Completata: { type: Boolean, required: true },
  cod_ordine: { type: Number, required: false },
  cod_cliente: { type: Number, required: false },
  cod_fornitore: { type: Number, required: true },
  cod_mov_maga: { type: Number, required: true },
  cod_utente: { type: Number, required: true },
  cod: { type: Number, required: true },
  cod_azienda: { type: Number, required: true },
  Validato: { type: Boolean, required: false },
  "Validato da": { type: String, required: false, maxlength: 50 },
  "Validato il": { type: Date, required: false },
  Protocollo: { type: String, required: false, maxlength: 65 },
  cod_validatore: { type: Number, required: false },
  "Marca Tubo": { type: String, required: false, maxlength: 50 },
  "Modello Tubo": { type: String, required: false, maxlength: 50 },
  "Anode SN": { type: String, required: false, maxlength: 50 },
  "Housing SN": { type: String, required: false, maxlength: 50 },
  "Installato il": { type: Date, required: false },
  "Tipo Contatore": { type: String, required: false, maxlength: 50 },
  Contatore: { type: String, required: false, maxlength: 50 }
},
{ collection: "Check List Interna", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("CheckListInterna", schema);
