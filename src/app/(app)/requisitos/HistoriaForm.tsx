"use client";

import { useState } from "react";
import {
  actualizarHistoria,
  borrarHistoria,
  crearHistoria,
  ESTADOS_HISTORIA,
  type Historia,
  type HistoriaInput,
} from "@/lib/requisitos";

function contador(v: string) {
  return `${v.length} caracteres`;
}

export function HistoriaForm({
  requisitoId,
  historia,
  codigoSugerido,
  onClose,
  onSaved,
}: {
  requisitoId: string;
  historia: Historia | null;
  codigoSugerido: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<HistoriaInput>({
    requisito_id: requisitoId,
    codigo: historia?.codigo ?? codigoSugerido,
    estado: historia?.estado ?? "Borrador",
    como: historia?.como ?? "",
    quiero: historia?.quiero ?? "",
    para: historia?.para ?? "",
    comportamiento_actual: historia?.comportamiento_actual ?? "",
    comportamiento_esperado: historia?.comportamiento_esperado ?? "",
    criterios_aceptacion: historia?.criterios_aceptacion ?? "",
    reglas_negocio: historia?.reglas_negocio ?? "",
    requisitos_funcionales: historia?.requisitos_funcionales ?? "",
    definicion_terminado: historia?.definicion_terminado ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof HistoriaInput>(k: K, v: HistoriaInput[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function guardar() {
    if (!f.codigo.trim()) {
      setError("El código identificador es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (historia) await actualizarHistoria(historia.id, f);
      else await crearHistoria(f);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando la historia");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!historia || !confirm("¿Eliminar esta historia de usuario?")) return;
    setSaving(true);
    try {
      await borrarHistoria(historia.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando");
      setSaving(false);
    }
  }

  const campoLargo =
    "w-full text-sm rounded-md border border-border bg-background px-3 py-2 resize-y min-h-[90px]";
  const label = "text-xs font-medium text-muted";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl my-6 rounded-lg border border-border bg-surface p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            📖 {historia ? "Editar" : "Nueva"} Historia de Usuario
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={label}>Código Identificador</span>
            <input
              value={f.codigo}
              onChange={(e) => set("codigo", e.target.value)}
              className="text-sm rounded-md border border-border bg-background px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={label}>Estado</span>
            <select
              value={f.estado}
              onChange={(e) => set("estado", e.target.value)}
              className="text-sm rounded-md border border-border bg-background px-3 py-2"
            >
              {ESTADOS_HISTORIA.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={label}>Como (rol de usuario)</span>
          <input
            value={f.como}
            onChange={(e) => set("como", e.target.value)}
            placeholder="Analista de Administración del Personal"
            className="text-sm rounded-md border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={label}>Quiero (funcionalidad)</span>
          <input
            value={f.quiero}
            onChange={(e) => set("quiero", e.target.value)}
            placeholder="Que marque de forma automática en Nomma los retiros con viabilidad"
            className="text-sm rounded-md border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={label}>Para (beneficio de negocio)</span>
          <input
            value={f.para}
            onChange={(e) => set("para", e.target.value)}
            placeholder="Reducir los tiempos de operación en un 15% diario"
            className="text-sm rounded-md border border-border bg-background px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={label}>Comportamiento Actual (AS-IS)</span>
              <span className="text-[10px] text-muted">{contador(f.comportamiento_actual)}</span>
            </div>
            <textarea
              value={f.comportamiento_actual}
              onChange={(e) => set("comportamiento_actual", e.target.value)}
              className={campoLargo}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={label}>Comportamiento Esperado (TO-BE)</span>
              <span className="text-[10px] text-muted">{contador(f.comportamiento_esperado)}</span>
            </div>
            <textarea
              value={f.comportamiento_esperado}
              onChange={(e) => set("comportamiento_esperado", e.target.value)}
              className={campoLargo}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className={label}>Criterios de Aceptación (uno por línea)</span>
            <span className="text-[10px] text-muted">{contador(f.criterios_aceptacion)}</span>
          </div>
          <textarea
            value={f.criterios_aceptacion}
            onChange={(e) => set("criterios_aceptacion", e.target.value)}
            placeholder={"1. Ver una marcación de retiro en Nomma 100% de forma automática."}
            className={campoLargo}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className={label}>Reglas de Negocio</span>
            <span className="text-[10px] text-muted">{contador(f.reglas_negocio)}</span>
          </div>
          <textarea
            value={f.reglas_negocio}
            onChange={(e) => set("reglas_negocio", e.target.value)}
            className={campoLargo}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={label}>Req. Funcionales</span>
              <span className="text-[10px] text-muted">{contador(f.requisitos_funcionales)}</span>
            </div>
            <textarea
              value={f.requisitos_funcionales}
              onChange={(e) => set("requisitos_funcionales", e.target.value)}
              placeholder="Exportar en PDF y Excel…"
              className={campoLargo}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={label}>Definición de Terminado (DoD)</span>
              <span className="text-[10px] text-muted">{contador(f.definicion_terminado)}</span>
            </div>
            <textarea
              value={f.definicion_terminado}
              onChange={(e) => set("definicion_terminado", e.target.value)}
              placeholder="Pruebas unitarias al 80%…"
              className={campoLargo}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between border-t border-border pt-3">
          {historia ? (
            <button
              onClick={eliminar}
              disabled={saving}
              className="text-xs text-danger hover:underline disabled:opacity-50"
            >
              Eliminar historia
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-muted">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              className="text-sm rounded-md bg-accent text-accent-foreground px-4 py-2 disabled:opacity-60"
            >
              {saving ? "Guardando…" : historia ? "Actualizar Historia" : "Crear Historia"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
