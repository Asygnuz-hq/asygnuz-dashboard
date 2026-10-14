"use client";

import { useState, useTransition } from "react";
import type { KaneoProject, KaneoProjectMember, KaneoWorkspaceMember } from "@/lib/kaneo/client";
import { agregarMiembroProyecto, quitarMiembroProyecto } from "./actions";

export type ProyectoConMiembros = {
  proyecto: KaneoProject;
  frente: "Growth" | "Software";
  workspaceId: string;
  miembros: KaneoProjectMember[];
};

function ProyectoCard({
  item,
  miembrosWorkspace,
  deshabilitado,
}: {
  item: ProyectoConMiembros;
  miembrosWorkspace: KaneoWorkspaceMember[];
  deshabilitado: boolean;
}) {
  const [miembros, setMiembros] = useState(item.miembros);
  const [seleccionado, setSeleccionado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const disponibles = miembrosWorkspace.filter((m) => !miembros.some((pm) => pm.userId === m.id));
  const restringido = miembros.length > 0;

  function agregar() {
    if (!seleccionado) return;
    setError(null);
    const userId = seleccionado;
    const persona = miembrosWorkspace.find((m) => m.id === userId);
    startTransition(async () => {
      try {
        await agregarMiembroProyecto(item.proyecto.id, userId);
        if (persona) {
          setMiembros((prev) => [
            ...prev,
            { id: `local-${userId}`, userId, name: persona.name, email: persona.email, createdAt: new Date().toISOString() },
          ]);
        }
        setSeleccionado("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar.");
      }
    });
  }

  function quitar(userId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await quitarMiembroProyecto(item.proyecto.id, userId);
        setMiembros((prev) => prev.filter((m) => m.userId !== userId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar.");
      }
    });
  }

  return (
    <div className="glass glass-hover rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{item.proyecto.name}</p>
          <p className="text-xs text-muted">{item.frente}</p>
        </div>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            restringido ? "bg-accent/15 text-accent-bright" : "bg-surface-alt text-muted"
          }`}
        >
          {restringido ? "Restringido" : "Visible para todo el workspace"}
        </span>
      </div>

      {miembros.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {miembros.map((m) => (
            <li key={m.userId} className="flex items-center justify-between text-sm">
              <span>
                {m.name} <span className="text-muted">· {m.email}</span>
              </span>
              <button
                onClick={() => quitar(m.userId)}
                disabled={deshabilitado || pendiente}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <select
          value={seleccionado}
          onChange={(e) => setSeleccionado(e.target.value)}
          disabled={deshabilitado || pendiente || disponibles.length === 0}
          className="flex-1 text-sm rounded-md border border-border bg-transparent px-2 py-1.5 disabled:opacity-50"
        >
          <option value="">
            {disponibles.length === 0 ? "Todos los del workspace ya están agregados" : "Agregar persona…"}
          </option>
          {disponibles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
        <button
          onClick={agregar}
          disabled={deshabilitado || pendiente || !seleccionado}
          className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {!restringido && (
        <p className="text-xs text-muted">
          Sin nadie agregado aquí, este proyecto sigue visible para todo el workspace. En cuanto agregues
          a la primera persona, queda restringido solo a quienes agregues (más los admin del workspace).
        </p>
      )}
    </div>
  );
}

export function PermisosClient({
  proyectos,
  miembrosPorWorkspace,
  deshabilitado,
}: {
  proyectos: ProyectoConMiembros[];
  miembrosPorWorkspace: Record<string, KaneoWorkspaceMember[]>;
  deshabilitado: boolean;
}) {
  const frentes: ("Growth" | "Software")[] = ["Growth", "Software"];

  return (
    <div className="flex flex-col gap-8">
      {frentes.map((frente) => {
        const items = proyectos.filter((p) => p.frente === frente);
        if (items.length === 0) return null;
        return (
          <div key={frente}>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              ASYGNUZ {frente}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <ProyectoCard
                  key={item.proyecto.id}
                  item={item}
                  miembrosWorkspace={miembrosPorWorkspace[item.workspaceId] ?? []}
                  deshabilitado={deshabilitado}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
