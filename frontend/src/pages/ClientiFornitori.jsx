import AppLayout from "../components/AppLayout.jsx";
import { ClientiFornitoriPicker } from "../features/clienti-fornitori/index.js";

export default function ClientiFornitoriPage() {
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
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3">
          <ClientiFornitoriPicker autoSelectFirst className="min-h-0" />
        </div>
      </section>
    </AppLayout>
  );
}
