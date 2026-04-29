import { useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import { ClientiFornitoriPicker, getTypeLabel } from "../features/clienti-fornitori/index.js";

export default function ClientiFornitoriPage() {
  const [selectedRecord, setSelectedRecord] = useState(null);

  return (
    <AppLayout
      fullscreen
      contextLabel="Produttivita"
      pageTitle="Clienti / Fornitori"
      brandContext="Anagrafiche"
      defaultOpenSection="PRODUTTIVITA"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-hidden sm:px-6"
    >
      <section className="warehouse-section flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Archivio anagrafiche</p>
            <h2 className="text-lg font-semibold">Elenco clienti e fornitori per wizard offerte</h2>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <ClientiFornitoriPicker onSelectRecord={setSelectedRecord} autoSelectFirst className="min-h-0" />

          <aside className="min-h-0 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Record selezionato</p>
            {!selectedRecord ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Seleziona una riga per restituire il record al chiamante.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Nominativo</p>
                  <p className="text-sm font-semibold">{selectedRecord.nominativo || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Tipo</p>
                  <p className="text-sm">{getTypeLabel(selectedRecord.tipo)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">P.IVA / C.F.</p>
                  <p className="text-sm">{selectedRecord.piva || selectedRecord.codFiscale || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Indirizzo</p>
                  <p className="text-sm">{selectedRecord.indirizzo || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Contatti</p>
                  <p className="text-sm">{selectedRecord.email || selectedRecord.pec || selectedRecord.telefoni || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Evento al chiamante</p>
                  <pre className="mt-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-[11px] leading-4 text-[var(--page-fg)]">
{`onSelectRecord(record)\n// record.cod = ${selectedRecord.cod || "-"}`}
                  </pre>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </AppLayout>
  );
}
