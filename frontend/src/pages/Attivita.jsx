import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const COLUMNS = [
  { id: "todo", label: "Da Fare", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/5" },
  { id: "in_progress", label: "In Corso", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  { id: "done", label: "Completata", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5" }
];

const PRIORITY_META = {
  low: { label: "Bassa", dot: "bg-slate-400" },
  medium: { label: "Media", dot: "bg-amber-400" },
  high: { label: "Alta", dot: "bg-rose-400" }
};

const NEXT = { todo: "in_progress", in_progress: "done", done: null };
const PREV = { todo: null, in_progress: "todo", done: "in_progress" };

const emptyForm = (status = "todo") => ({
  title: "",
  description: "",
  status,
  assignee: "",
  priority: "medium",
  dueDate: ""
});

function fmtDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.ceil((date - new Date()) / 86400000);
  return {
    str: date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
    overdue: diff < 0,
    soon: diff >= 0 && diff <= 3
  };
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] || "").toUpperCase())
    .join("");
}

function TaskModal({ initial, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(initial);
  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--page-fg)]">{initial.id ? "Modifica Task" : "Nuova Task"}</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
          className="flex flex-col gap-4 px-6 py-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Titolo</label>
            <input
              autoFocus
              value={form.title}
              onChange={setField("title")}
              placeholder="Titolo task"
              className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Descrizione</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={setField("description")}
              placeholder="Dettagli"
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Status</label>
              <select
                value={form.status}
                onChange={setField("status")}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
              >
                {COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Priorita</label>
              <select
                value={form.priority}
                onChange={setField("priority")}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
              >
                {Object.entries(PRIORITY_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Assegnatario</label>
              <input
                value={form.assignee}
                onChange={setField("assignee")}
                placeholder="Nome"
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Scadenza</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={setField("dueDate")}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--page-fg)] outline-none focus:border-sky-400/70"
              />
            </div>
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-sky-500/70 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-60"
            >
              {saving ? "Salvataggio..." : initial.id ? "Salva" : "Crea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove }) {
  const due = fmtDate(task.dueDate);
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.medium;

  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)}
      className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:border-[color:rgba(255,255,255,0.25)] hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priority.dot}`} />
        <p className="flex-1 text-sm font-medium leading-snug text-[var(--page-fg)] break-words">{task.title}</p>
      </div>
      {task.description ? <p className="mt-1.5 ml-4 text-xs text-[var(--muted)]">{task.description}</p> : null}
      <div className="mt-3 ml-4 flex flex-wrap items-center gap-2">
        {task.assignee ? (
          <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[9px] font-semibold text-sky-300">
              {getInitials(task.assignee)}
            </span>
            <span className="max-w-[100px] truncate">{task.assignee}</span>
          </span>
        ) : null}
        {due ? (
          <span className={`flex items-center gap-1 text-xs ${due.overdue ? "text-rose-400" : due.soon ? "text-amber-400" : "text-[var(--muted)]"}`}>
            <i className="fa-regular fa-calendar" aria-hidden="true" />
            {due.str}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!PREV[task.status]}
            onClick={() => onMove(task, PREV[task.status])}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--page-fg)] disabled:pointer-events-none disabled:opacity-30"
            title="Indietro"
          >
            <i className="fa-solid fa-chevron-left text-[11px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!NEXT[task.status]}
            onClick={() => onMove(task, NEXT[task.status])}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--page-fg)] disabled:pointer-events-none disabled:opacity-30"
            title="Avanti"
          >
            <i className="fa-solid fa-chevron-right text-[11px]" aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--page-fg)]"
            title="Modifica"
          >
            <i className="fa-solid fa-pen text-[11px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-rose-500/15 hover:text-rose-400"
            title="Elimina"
          >
            <i className="fa-solid fa-trash text-[11px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttivitaPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const byStatus = useMemo(() => {
    const buckets = { todo: [], in_progress: [], done: [] };
    for (const task of tasks) {
      if (buckets[task.status]) buckets[task.status].push(task);
    }
    return buckets;
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/tasks`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Errore caricamento task");
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSave = async (form) => {
    if (!String(form.title || "").trim()) {
      setModalError("Il titolo e obbligatorio.");
      return;
    }
    setModalSaving(true);
    setModalError("");
    try {
      if (form.id) {
        const response = await fetch(`${API_BASE}/api/tasks/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Errore aggiornamento task");
        setTasks((prev) => prev.map((task) => (task.id === data.task.id ? data.task : task)));
      } else {
        const response = await fetch(`${API_BASE}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Errore creazione task");
        setTasks((prev) => [...prev, data.task]);
      }
      setModal(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Errore salvataggio task");
    } finally {
      setModalSaving(false);
    }
  };

  const handleMove = async (task, newStatus) => {
    if (!newStatus) return;
    setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, status: newStatus } : row)));
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      if (!response.ok) throw new Error("Errore");
    } catch {
      fetchTasks();
    }
  };

  const handleDrop = (columnId) => async (event) => {
    event.preventDefault();
    setDragOverCol(null);
    const taskId = event.dataTransfer.getData("taskId");
    if (!taskId) return;
    const task = tasks.find((row) => row.id === taskId);
    if (task && task.status !== columnId) await handleMove(task, columnId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Errore");
      setTasks((prev) => prev.filter((task) => task.id !== deleteTarget.id));
    } catch {
      fetchTasks();
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout
      contextLabel="Produttivita / Attivita"
      pageTitle="Attivita"
      defaultOpenSection="PRODUTTIVITA"
      mainClassName="flex-1 min-h-0 overflow-hidden p-4 sm:p-6"
      fullscreen
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--page-fg)]">{loading ? "Attivita" : `Attivita (${tasks.length})`}</h2>
          <button
            type="button"
            onClick={() => {
              setModal(emptyForm("todo"));
              setModalError("");
            }}
            className="h-10 rounded-md border border-sky-500/60 bg-sky-500/10 px-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/20"
          >
            + Nuova Task
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = byStatus[column.id] || [];
            const isOver = dragOverCol === column.id;
            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverCol(column.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverCol(null);
                }}
                onDrop={handleDrop(column.id)}
                className={`flex min-h-0 flex-col rounded-2xl border ${column.border} ${isOver ? "ring-2 ring-sky-500/40" : ""}`}
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${column.color}`}>{column.label}</span>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-strong)] px-1.5 text-[10px] font-semibold text-[var(--muted)]">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModal(emptyForm(column.id));
                      setModalError("");
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--page-fg)]"
                    title={`Aggiungi in ${column.label}`}
                  >
                    <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
                  </button>
                </div>
                <div className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-3 ${column.bg}`}>
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onEdit={setModal} onDelete={setDeleteTarget} onMove={handleMove} />
                  ))}
                  {!columnTasks.length ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModal(emptyForm(column.id));
                        setModalError("");
                      }}
                      className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-8 text-xs text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                    >
                      + Aggiungi task
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal !== null ? (
        <TaskModal initial={modal} onSave={handleSave} onClose={() => setModal(null)} saving={modalSaving} error={modalError} />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--page-fg)]">Elimina Task</h2>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                onClick={() => setDeleteTarget(null)}
                aria-label="Chiudi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-[var(--page-fg)]">
              Eliminare <span className="font-semibold">{deleteTarget.title}</span>?
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--page-fg)] hover:bg-[var(--hover)]"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md border border-rose-500/70 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
