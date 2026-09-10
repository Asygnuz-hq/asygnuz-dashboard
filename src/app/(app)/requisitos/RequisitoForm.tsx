"use client";

import { useState } from "react";
import {
  actualizarRequisito,
  crearRequisito,
  ESTADOS_TRAZABILIDAD,
  FASES_IMPLEMENTACION,
  type OpcionSimple,
  type Requisito,
  type RequisitoInput,
  TIPOS_CAMBIO,
} from "@/lib/requisitos";

export function RequisitoForm({
  clienteId,
  requisito,
  equipo,
  onClose,
  onSaved,
}: {
  clienteId: string;
  requisito: Requisito | null;
  equipo: OpcionSimple[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<RequisitoInput>({
    cliente_id: requisito?.cliente_id ?? clienteId,
    descripcion: requisito?.descripcion ?? "",
    estado_trazabilidad: requisito?.estado_trazabilidad ?? "inicio",
    pct_planificado: requisito?.pct_planificado ?? 0,
    pct_ejecutado: requisito?.pct_ejecutado ?? 0,
    fecha_inicio: requisito?.fecha_inicio ?? null,
    fecha_fin: requisito?.fecha_fin ?? null,
    fase_implementacion: requisito?.fase_implementacion ?? "Fase 1",
    plataforma_software: requisito?.plataforma_software ?? "",
    responsable_id: requisito?.responsable_id ?? null,
    tipo_cambio: requisito?.tipo_cambio ?? "Nueva funcionalidad",
    prioridad: requisito?.prioridad ?? 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof RequisitoInput>(k: K, v: RequisitoInput[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function guardar() {
    if (!f.descripcion.trim()) {
      setError("La descripción del requisito es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (requisito) await actualizarRequisito(requisito.id, f);
      else await crearRequisito(f);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el requisito");
    } finally {
      setSaving(false);
    }
  }

  const label = "text-xs font-medium text-muted";
  const input = "text-sm rounded-md border border-border bg-background px-3 py-2";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl my-6 rounded-lg border border-border bg-surface p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {requisito ? `Editar Requisito #${requisito.numero}` : "Nuevo Requisito de Negocio"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className={label}>Descripción del Requisito (objetivo general)</span>
          <textarea
            value={f.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            rows={3}
            placeholder="Automatizar la marcación de retiro en Nomma luego de analizar la viabilidad de los estudios de SST."
            className={`${input} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Estado de Trazabilidad</span>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS_TRAZABILIDAD.map((e) => (
              <button
                key={e.value}
                onClick={() => set("estado_trazabilidad", e.value)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  f.estado_trazabilidad === e.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border text-foreground/70 hover:bg-surface-alt"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={label}>% Planificado (Meta)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={f.pct_planificado}
              onChange={(e) => set("pct_planificado", Number(e.target.value))}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={label}>% Ejecutado (Real)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={f.pct_ejecutado}
              onChange={(e) => set("pct_ejecutado", Number(e.target.value))}
              className={input}
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-alt/50 p-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted">
            <span>
              Meta: <span className="text-accent-bright font-medium">{f.pct_planificado}%</span>
            </span>
            <span>
              Avance real:{" "}
              <span className="text-success font-medium">{f.pct_ejecutado}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-accent-bright/30"
              style={{ width: `${Math.min(100, f.pct_planificado)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-success"
              style={{ width: `${Math.min(100, f.pct_ejecutado)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={label}>Fecha Inicio</span>
            <input
              type="date"
              value={f.fecha_inicio ?? ""}
              onChange={(e) => set("fecha_inicio", e.target.value || null)}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={label}>Fecha Fin</span>
            <input
              type="date"
              value={f.fecha_fin ?? ""}
              onChange={(e) => set("fecha_fin", e.target.value || null)}
              className={input}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={label}>Fase de Implementación</span>
            <select
              value={f.fase_implementacion ?? ""}
              onChange={(e) => set("fase_implementacion", e.target.value || null)}
              className={input}
            >
              {FASES_IMPLEMENTACION.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className={label}>Plataforma / Software</span>
            <input
              value={f.plataforma_software ?? ""}
              onChange={(e) => set("plataforma_software", e.target.value || null)}
              placeholder="Nomma"
              className={input}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={label}>Responsable Asignado</span>
          <select
            value={f.responsable_id ?? ""}
            onChange={(e) => set("responsable_id", e.target.value || null)}
            className={input}
          >
            <option value="">(Sin asignar)</option>
            {equipo.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={label}>Tipo de Cambio</span>
            <select
              value={f.tipo_cambio ?? ""}
              onChange={(e) => set("tipo_cambio", e.target.value || null)}
              className={input}
            >
              {TIPOS_CAMBIO.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className={label}>Prioridad (1-5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={f.prioridad}
              onChange={(e) => set("prioridad", Number(e.target.value))}
              className={input}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
          <button onClick={onClose} className="text-sm text-muted">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="text-sm rounded-md bg-accent text-accent-foreground px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
