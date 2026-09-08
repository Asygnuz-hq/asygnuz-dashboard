"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import type { MetricasCrecimiento } from "@/lib/espocrm/metrics";
import type { CHART_COLORS } from "@/lib/useTheme";

const ESTADO_LABEL: Record<string, string> = {
  New: "Nuevo",
  Assigned: "Asignado",
  "In Process": "En proceso",
  Converted: "Convertido",
  Recycled: "Reciclado",
  Dead: "Descartado",
};

function formatCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    valor
  );
}

export function SeccionCrecimiento({
  metricas,
  error,
  loading,
  chartColors,
}: {
  metricas: MetricasCrecimiento | null;
  error: string | null;
  loading: boolean;
  actualizando: boolean;
  recargar: () => void;
  chartColors: (typeof CHART_COLORS)[keyof typeof CHART_COLORS];
}) {
  return (
    <div className="flex flex-col gap-6">
      {loading && <p className="text-sm text-muted">Cargando datos de EspoCRM…</p>}
      {error && (
        <p className="text-sm text-danger">
          No se pudo leer EspoCRM: {error}. Revisa que EspoCRM esté corriendo y las variables ESPOCRM_* en .env.local.
        </p>
      )}

      {metricas && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Leads nuevos (semana)" value={String(metricas.leadsNuevosSemana)} hint={`${metricas.leadsNuevosMes} en el mes`} />
            <KpiCard
              label="Tasa de contacto"
              value={`${(metricas.tasaContacto * 100).toFixed(0)}%`}
              hint="Leads que ya pasaron de Nuevo"
            />
            <KpiCard
              label="Tiempo de respuesta"
              value={
                metricas.tiempoRespuestaPromedioHoras === null
                  ? "—"
                  : metricas.tiempoRespuestaPromedioHoras < 24
                    ? `${metricas.tiempoRespuestaPromedioHoras.toFixed(1)} h`
                    : `${(metricas.tiempoRespuestaPromedioHoras / 24).toFixed(1)} d`
              }
              hint="Promedio hasta el primer movimiento"
            />
            <KpiCard label="Pipeline activo" value={formatCOP(metricas.valorPipelineTotal)} hint="Sin contar Cliente ni Perdido" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Pipeline por etapa</h3>
              <div className="h-64 rounded-lg border border-border bg-surface p-4">
                {metricas.porEtapa.length === 0 ? (
                  <p className="text-sm text-muted flex items-center justify-center h-full">
                    Sin oportunidades todavía — se llenan al convertir un Lead.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.porEtapa}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="etapa" stroke={chartColors.axis} fontSize={11} />
                      <YAxis stroke={chartColors.axis} fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                        formatter={(value) => [String(value), "Oportunidades"]}
                      />
                      <Bar dataKey="total" name="Oportunidades" fill="#3c5e99" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Origen del lead</h3>
              <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2">
                {metricas.porOrigen.map((o) => (
                  <div key={o.origen} className="flex items-center justify-between text-sm">
                    <span>{o.origen}</span>
                    <span className="text-muted">{o.total}</span>
                  </div>
                ))}
                {metricas.porOrigen.length === 0 && <p className="text-sm text-muted">Sin leads todavía.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Leads por categoría de negocio</h3>
              <div className="flex flex-col gap-2">
                {metricas.porCategoria.slice(0, 8).map((c) => (
                  <div key={c.categoria} className="rounded-lg border border-border bg-surface px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm">{c.categoria.replace(/_/g, " ")}</span>
                    <span className="text-sm text-muted">{c.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Leads más recientes</h3>
              <div className="flex flex-col gap-2">
                {metricas.leadsRecientes.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{l.nombre}</p>
                      <p className="text-xs text-muted truncate">
                        {ESTADO_LABEL[l.estado] ?? l.estado}
                        {l.categoria && ` · ${l.categoria.replace(/_/g, " ")}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted shrink-0">{l.creadoHace === 0 ? "hoy" : `hace ${l.creadoHace}d`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
