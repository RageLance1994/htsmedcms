import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  data: { type: Date, required: true },
  "Tipo Verifica - Iniziale": { type: Boolean, required: false },
  "Tipo Verifica - Periodica": { type: Boolean, required: false },
  "Tipo Verifica - Post Riparazione": { type: Boolean, required: false },
  "Dati Sistema": { type: String, required: true, maxlength: 50 },
  "Locale Medico Gruppo": { type: Number, required: true },
  "Classe Isolamento": { type: String, required: true, maxlength: 5 },
  "Tenzione di Rete": { type: Number, required: true },
  "Esito ed Eventuali Note": { type: String, required: true },
  Gantry: { type: Boolean, required: false },
  "Lettino Portapaziente": { type: Boolean, required: false },
  "PDC - PDU": { type: Boolean, required: false },
  WCS: { type: Boolean, required: false },
  "Console - Ricostruttore": { type: Boolean, required: false },
  "Eventuali Masse Estranee sal Gantry": { type: Boolean, required: false },
  Altro: { type: Boolean, required: false },
  Altro2: { type: Boolean, required: false },
  Altro3: { type: Boolean, required: false },
  "Misura Corrente verso terra": { type: Boolean, required: false },
  "Prova Funzionale": { type: Boolean, required: false },
  "Strumentazione Utilizzata:": { type: String, required: false, maxlength: 50 },
  "Esito Verifica di Conformità:": { type: Boolean, required: false },
  Protocollo: { type: String, required: false, maxlength: 64 },
  lbALTRO: { type: String, required: false },
  lbALTRO2: { type: String, required: false },
  lbALTRO3: { type: String, required: false },
  Note: { type: String, required: false },
  cod: { type: Number, required: true },
  cod_cliente: { type: Number, required: true },
  cod_sistema: { type: Number, required: true },
  cod_tecnico: { type: Number, required: true },
  cod_Azienda: { type: Number, required: true },
  "Gantry Fail": { type: Boolean, required: false },
  "Lettino Fali": { type: Boolean, required: false },
  "PDU Fail": { type: Boolean, required: false },
  "WCS Fail": { type: Boolean, required: false },
  "Console Fail": { type: Boolean, required: false },
  "EV Masse Fail": { type: Boolean, required: false },
  "Altro Fail": { type: Boolean, required: false },
  "Altro Fail1": { type: Boolean, required: false },
  "Altro Fail2": { type: Boolean, required: false },
  "Misura Corrente Fail": { type: Boolean, required: false },
  "Misura Corrente ND": { type: Boolean, required: false },
  "Prova Funzionale Fail": { type: Boolean, required: false },
  "Esito verifica Fail": { type: Boolean, required: false },
  cod_allegato: { type: Number, required: false }
},
{ collection: "Verifiche Norma IEC62353", timestamps: false }
);

schema.index({ cod: 1 }, { unique: true });

export default mongoose.model("VerificheNormaIec62353", schema);
