export const CLIENTI_FORNITORI_TYPE_OPTIONS = [
  { value: "all", label: "Tutti" },
  { value: "cliente", label: "Clienti" },
  { value: "fornitore", label: "Fornitori" },
  { value: "cliente-fornitore", label: "Clienti/Fornitori" }
];

const TYPE_LABELS = {
  all: "Tutti",
  cliente: "Cliente",
  fornitore: "Fornitore",
  "cliente-fornitore": "Cliente/Fornitore",
  altro: "Altro"
};

export const getTypeLabel = (value) => TYPE_LABELS[String(value || "").trim().toLowerCase()] || TYPE_LABELS.altro;

export const recordMatchesType = (record, tipo) => {
  if (tipo === "all") return true;
  return String(record?.tipo || "").toLowerCase() === String(tipo || "").toLowerCase();
};
