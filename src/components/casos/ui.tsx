"use client";

// Piezas compartidas por los negocios a precio fijo y por mensualidad (2026-11-13).

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ETAPA, ETAPAS, type EtapaId } from "@/lib/casos/etapas";
import type { Rango } from "@/lib/casos/modelo";

export const BTN = "text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt disabled:opacity-50";
export const BTN_PRIMARIO = "text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50";
export const TH = "px-2 py-2 text-left text-xs uppercase tracking-wide text-muted border-b border-border";
export const TD = "px-2 py-1.5 border-b border-border";
export const millones = (x: number) => `${(x / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;

export type TipoNegocio = "proyecto" | "mensualidad";
export const TIPOS: Record<TipoNegocio, string> = { proyecto: "Proyecto a precio fijo", mensualidad: "Mensualidad" };

export type Caso<S> = {
  nombre: string; cliente: string | null; precio: number; tipo: TipoNegocio; supuestos: S;
  etapa: EtapaId; prob_cierre: number | null; fecha_cierre: string | null; responsable: string | null;
  proyecto_kaneo: string | null; notas: string | null; motivo_perdida: string | null;
};
export type Cambiar<S> = (f: (c: Caso<S>) => void) => void;

const COLUMNAS = "nombre, cliente, precio, tipo, supuestos, etapa, prob_cierre, fecha_cierre, responsable, proyecto_kaneo, notas, motivo_perdida";

/** Carga un negocio, lleva los cambios sin guardar y lo guarda (marca etapa_desde si cambió la etapa). */
export function useCaso(id: string) {
  const [caso, setCaso] = useState<Caso<unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"guardado" | "cambios" | "guardando">("guardado");
  const [etapaGuardada, setEtapaGuardada] = useState<EtapaId | null>(null);

  useEffect(() => {
    createClient()
      .from("casos_negocio")
      .select(COLUMNAS)
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setCaso({
          ...data,
          tipo: data.tipo === "mensualidad" ? "mensualidad" : "proyecto",
          precio: Number(data.precio),
          prob_cierre: data.prob_cierre === null ? null : Number(data.prob_cierre),
        } as Caso<unknown>);
        setEtapaGuardada(data.etapa);
      });
  }, [id]);

  const cambiar: Cambiar<unknown> = (f) => {
    setCaso((c) => {
      if (!c) return c;
      const n = structuredClone(c);
      f(n);
      return n;
    });
    setEstado("cambios");
  };

  async function guardar() {
    if (!caso) return;
    setEstado("guardando");
    const ahora = new Date().toISOString();
    const { error } = await createClient()
      .from("casos_negocio")
      .update({ ...caso, actualizado_en: ahora, ...(caso.etapa !== etapaGuardada ? { etapa_desde: ahora } : {}) })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return setEstado("cambios");
    }
    setError(null);
    setEtapaGuardada(caso.etapa);
    setEstado("guardado");
  }

  return { caso, error, estado, cambiar, guardar };
}

// Input numérico; con `pct` muestra 40 y guarda 0,4.
export function Num({ value, onChange, pct, className = "w-28" }: { value: number; onChange: (v: number) => void; pct?: boolean; className?: string }) {
  return (
    <input
      type="number"
      step="any"
      className={`${className} text-right`}
      value={pct ? Math.round(value * 10000) / 100 : value}
      onChange={(e) => onChange((Number(e.target.value) || 0) / (pct ? 100 : 1))}
    />
  );
}

/** Mínimo / más probable / máximo en una fila. */
export function RangoInput({ value, onChange, pct, className = "w-24" }: { value: Rango; onChange: (r: Rango) => void; pct?: boolean; className?: string }) {
  return (
    <div className="flex gap-1">
      {(["min", "moda", "max"] as (keyof Rango)[]).map((k) => (
        <Num key={k} pct={pct} className={className} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
      ))}
    </div>
  );
}

export function TablaFilas<T>({
  titulo, columnas, filas, nueva, onChange, celdas,
}: {
  titulo: string;
  columnas: string[];
  filas: T[];
  nueva: T;
  onChange: (f: T[]) => void;
  celdas: (r: T, set: (r: T) => void) => React.ReactNode[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{titulo}</h3>
      <table className="text-sm">
        <thead>
          <tr>
            {columnas.map((c) => <th key={c} className={TH}>{c}</th>)}
            <th className={TH} />
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={i}>
              {celdas(r, (n) => onChange(filas.map((x, j) => (j === i ? n : x)))).map((c, j) => <td key={j} className={TD}>{c}</td>)}
              <td className={TD}>
                <button className="text-xs text-danger" aria-label="Quitar fila" onClick={() => onChange(filas.filter((_, j) => j !== i))}>Quitar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={`${BTN} mt-2`} onClick={() => onChange([...filas, structuredClone(nueva)])}>Agregar</button>
    </div>
  );
}

export function PanelSeguimiento<S>({ caso, cambiar }: { caso: Caso<S>; cambiar: Cambiar<S> }) {
  return (
    <section className="glass rounded-2xl border p-4 flex flex-col gap-3">
      <h2 className="font-display text-lg">Seguimiento</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Etapa
          <select value={caso.etapa} onChange={(e) => cambiar((c) => void (c.etapa = e.target.value as EtapaId))}>
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prob. de cierre (%)
          <input
            type="number"
            min={0}
            max={100}
            className="w-24 text-right"
            placeholder={String(Math.round((ETAPA[caso.etapa]?.prob ?? 0) * 100))}
            value={caso.prob_cierre === null ? "" : Math.round(caso.prob_cierre * 100)}
            onChange={(e) =>
              cambiar((c) => void (c.prob_cierre = e.target.value === "" ? null : Math.min(1, Math.max(0, Number(e.target.value) / 100))))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cierre estimado
          <input type="date" value={caso.fecha_cierre ?? ""} onChange={(e) => cambiar((c) => void (c.fecha_cierre = e.target.value || null))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Responsable
          <input value={caso.responsable ?? ""} onChange={(e) => cambiar((c) => void (c.responsable = e.target.value || null))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Proyecto en Kaneo
          <input value={caso.proyecto_kaneo ?? ""} placeholder="Link o nombre" onChange={(e) => cambiar((c) => void (c.proyecto_kaneo = e.target.value || null))} />
        </label>
      </div>
      {caso.etapa === "perdido" && (
        <label className="flex flex-col gap-1 text-sm">
          Por qué se perdió
          <input value={caso.motivo_perdida ?? ""} placeholder="Precio, alcance, eligió otro proveedor…" onChange={(e) => cambiar((c) => void (c.motivo_perdida = e.target.value || null))} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Notas
        <textarea rows={2} value={caso.notas ?? ""} onChange={(e) => cambiar((c) => void (c.notas = e.target.value || null))} />
      </label>
      <p className="text-xs text-muted">Si dejas la probabilidad vacía, se usa la de la etapa. Los cambios se guardan con &quot;Guardar cambios&quot;.</p>
    </section>
  );
}
