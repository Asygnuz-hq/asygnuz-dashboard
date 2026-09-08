"use client";

import { Calendar, CalendarClock, CalendarX } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ColumnIcon } from "@/components/kaneo/ColumnIcon";
import { PriorityIcon } from "@/components/kaneo/PriorityIcon";
import { QuickAddTask } from "@/components/kaneo/QuickAddTask";
import { TaskDetailModal } from "@/components/kaneo/TaskDetailModal";
import type { KaneoColumn, KaneoTask } from "@/lib/kaneo/client";
import { dueDateStatusColors, getDueDateStatus } from "@/lib/kaneo/due-date-status";
import { getInitials } from "@/lib/kaneo/get-initials";
import { useTablero } from "@/lib/kaneo/useTablero";

// Tarjeta calcada de apps/web/src/components/kanban-board/task-card.tsx en
// el fork de Kaneo: mismo número+slug, mismo avatar circular con iniciales,
// mismos íconos de prioridad y de fecha de vencimiento con el mismo umbral
// de "por vencer" (3 días) -- para que una tarea se vea igual acá que en Kaneo.
function TarjetaTarea({
  tarea,
  slugProyecto,
  completada,
  onAbrir,
  onArrastrar,
}: {
  tarea: KaneoTask;
  slugProyecto: string;
  completada: boolean;
  onAbrir: () => void;
  onArrastrar: (e: React.DragEvent) => void;
}) {
  const estadoFecha = getDueDateStatus(tarea.dueDate, completada);
  const IconoFecha = estadoFecha === "overdue" ? CalendarX : estadoFecha === "due-soon" ? CalendarClock : Calendar;

  return (
    <button
      draggable
      onDragStart={onArrastrar}
      onClick={onAbrir}
      className="group relative w-full text-left rounded-lg border border-border bg-surface p-3 cursor-grab active:cursor-grabbing hover:border-accent-bright/50 hover:shadow-sm transition-[border-color,box-shadow]"
    >
      <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted/90">
        {slugProyecto}-{tarea.number}
      </div>

      <div className="absolute top-3 right-3">
        {tarea.assigneeName ? (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground"
            title={tarea.assigneeName}
          >
            {getInitials(tarea.assigneeName)}
          </div>
        ) : (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-alt"
            title="Sin asignar"
          >
            <span className="text-[10px] font-medium text-muted">?</span>
          </div>
        )}
      </div>

      <div className="mb-2.5 pr-6">
        <p
          className="overflow-hidden break-words leading-5 font-medium text-foreground/95 text-[15px]"
          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
        >
          {tarea.title}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {tarea.priority !== "no-priority" && (
          <span className="inline-flex items-center gap-1 rounded border border-border/70 bg-surface-alt px-2 py-1 text-[10px] font-medium text-muted">
            <PriorityIcon priority={tarea.priority} />
          </span>
        )}
        {tarea.dueDate && (
          <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded ${dueDateStatusColors[estadoFecha]}`}>
            <IconoFecha className="w-3 h-3" />
            <span>{new Date(tarea.dueDate).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function Columna({
  columna,
  tareas,
  slugProyecto,
  proyectoId,
  sobrevolada,
  onDragOver,
  onDragLeave,
  onDrop,
  onAbrirTarea,
  onCreada,
}: {
  columna: KaneoColumn;
  tareas: KaneoTask[];
  slugProyecto: string;
  proyectoId: string;
  sobrevolada: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onAbrirTarea: (id: string) => void;
  onCreada: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-72 shrink-0 flex flex-col gap-3 rounded-lg border p-3 transition-colors ${
        sobrevolada ? "border-accent-bright bg-accent/5" : "border-border bg-surface-alt/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ColumnIcon slug={columna.slug} isFinal={columna.isFinal} />
          <span className="truncate text-sm font-medium text-foreground/95">{columna.name}</span>
          <span className="rounded-md bg-surface-alt px-1.5 py-0.5 text-xs font-medium text-muted">
            {tareas.length}
          </span>
        </div>
        <QuickAddTask projectId={proyectoId} status={columna.slug} onDone={onCreada} compact />
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-[2rem]">
        {tareas.map((t) => (
          <TarjetaTarea
            key={t.id}
            tarea={t}
            slugProyecto={slugProyecto}
            completada={columna.isFinal}
            onAbrir={() => onAbrirTarea(t.id)}
            onArrastrar={(e) => e.dataTransfer.setData("text/plain", t.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TableroPage() {
  const { proyectos, proyectoId, setProyectoId, columnas, tareas, loading, error, recargar, moverTarea } =
    useTablero();
  const [tareaAbierta, setTareaAbierta] = useState<string | null>(null);
  const [columnaSobrevolada, setColumnaSobrevolada] = useState<string | null>(null);
  const slugProyecto = proyectos?.find((p) => p.id === proyectoId)?.slug ?? "";

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Tablero"
          subtitle="El mismo tablero de Kaneo, arrastra y suelta para cambiar de columna."
        />
        {proyectos && proyectos.length > 0 && (
          <select
            value={proyectoId ?? ""}
            onChange={(e) => setProyectoId(e.target.value)}
            className="text-sm rounded-md border border-border bg-surface px-3 py-1.5"
          >
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading && !error && <p className="text-sm text-muted">Cargando tablero…</p>}

      {!loading && columnas.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {columnas.map((col) => (
            <Columna
              key={col.id}
              columna={col}
              tareas={tareas
                .filter((t) => t.status === col.slug)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))}
              slugProyecto={slugProyecto}
              proyectoId={proyectoId ?? ""}
              sobrevolada={columnaSobrevolada === col.slug}
              onDragOver={(e) => {
                e.preventDefault();
                setColumnaSobrevolada(col.slug);
              }}
              onDragLeave={() => setColumnaSobrevolada((c) => (c === col.slug ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setColumnaSobrevolada(null);
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) moverTarea(taskId, col.slug);
              }}
              onAbrirTarea={setTareaAbierta}
              onCreada={recargar}
            />
          ))}
        </div>
      )}

      {!loading && !error && columnas.length === 0 && (
        <p className="text-sm text-muted">Este proyecto no tiene columnas todavía.</p>
      )}

      {tareaAbierta && (
        <TaskDetailModal
          taskId={tareaAbierta}
          onClose={() => setTareaAbierta(null)}
          onChanged={recargar}
        />
      )}
    </div>
  );
}
