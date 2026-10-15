"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import type { AvanceCliente, PeriodoMetricas } from "@/lib/portal/avanceTipos";
import { PanelAvanceMetricas } from "@/components/metricas/PanelAvanceMetricas";

// Panel de Avance dentro del Portal de Cliente: lo que hicimos (Kaneo), lo
// que subimos (parrilla + Instagram), la pauta (Meta Ads) y cómo va la
// cuenta. Mismo componente en /portal (cliente) y en la vista previa de
// /portal-admin, igual que VistaPortal.

export type EstadoAvance = {
  datos: AvanceCliente | null;
  cargando: boolean;
  error: string | null;
  periodo?: PeriodoMetricas;
  cambiarPeriodo?: (periodo: PeriodoMetricas) => void;
};

export function SeccionAvance({ estado, acento }: { estado: EstadoAvance; acento: string }) {
  const { datos, cargando, error, cambiarPeriodo } = estado;

  return (
    <section className="flex flex-col gap-6 w-full">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: FUENTE_DISPLAY }}>
            Avance del Proyecto & Métricas de Crecimiento
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Operación en vivo (Kaneo), pauta publicitaria (Meta Ads) y comunidad (Instagram).
          </p>
        </div>
        {datos && (
          <span className="text-xs text-muted">
            Actualizado {new Date(datos.generadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>

      {cargando && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
          <div className="glass rounded-2xl h-72 animate-pulse" />
        </div>
      )}

      {error && !cargando && (
        <div className="glass rounded-2xl p-6 border border-warning/30 text-center">
          <p className="text-sm font-medium text-foreground">No pudimos sincronizar el avance en este momento</p>
          <p className="text-xs text-muted mt-1">{error}</p>
        </div>
      )}

      {datos && !cargando && (
        <PanelAvanceMetricas
          datos={datos}
          acento={acento}
          alCambiarPeriodo={cambiarPeriodo}
        />
      )}
    </section>
  );
}
