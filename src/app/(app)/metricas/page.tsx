"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Semaforo } from "@/components/Semaforo";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { useMetricas } from "@/lib/kaneo/useMetricas";
import type { ProyectoMetrica } from "@/lib/kaneo/metrics";

const PALETTE = { activas: "#3c5e99", completadas: "#5c8a72", atrasadas: "#d9534f" };

function nivelProyecto(p: ProyectoMetrica): "verde" | "amarillo" | "rojo" {
  if (p.totalTareas === 0) return "verde";
  const ratioAtraso = p.atrasadas / p.totalTareas;
  if (ratioAtraso === 0) return "verde";
  if (ratioAtraso < 0.2) return "amarillo";
  return "rojo";
}

export default function MetricasPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const { metricas, error, loading } = useMetricas();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Métricas — Vista Ejecutiva"
          subtitle="Carga de trabajo y avance en tiempo real, leído directo de Kaneo."
        />
        <div className="flex gap-2">
          <Link href="/metricas/carga" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt">
            Carga por persona
          </Link>
          <Link href="/metricas/reporte" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt">
            Reporte para junta
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Cargando datos de Kaneo…</p>}
      {error && (
        <p className="text-sm text-danger">
          No se pudo leer Kaneo: {error}. Revisa que Kaneo esté corriendo y las variables KANEO_* en .env.local.
        </p>
      )}

      {metricas && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Tareas activas" value={String(metricas.totalActivas)} />
            <KpiCard
              label="Avance global"
              value={`${((metricas.totalCompletadas / Math.max(metricas.totalTareas, 1)) * 100).toFixed(0)}%`}
              hint={`${metricas.totalCompletadas} de ${metricas.totalTareas} tareas`}
            />
            <KpiCard label="Atrasadas" value={String(metricas.totalAtrasadas)} hint="Con fecha de vencimiento pasada" />
            <KpiCard label="Sin asignar" value={String(metricas.sinAsignar)} hint="Nadie las tiene en su lista" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Growth vs Software</h2>
            <div className="h-64 rounded-lg border border-border bg-surface p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas.porFrente}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="frente" stroke={chartColors.axis} fontSize={12} />
                  <YAxis stroke={chartColors.axis} fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                  />
                  <Legend />
                  <Bar dataKey="activas" name="Activas" fill={PALETTE.activas} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="completadas" name="Completadas" fill={PALETTE.completadas} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="atrasadas" name="Atrasadas" fill={PALETTE.atrasadas} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {metricas.tendenciaCreacion.length > 1 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Tendencia — tareas creadas por semana
              </h2>
              <div className="h-64 rounded-lg border border-border bg-surface p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricas.tendenciaCreacion}>
                    <defs>
                      <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5c8a72" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#5c8a72" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gSoftware" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3c5e99" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3c5e99" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="etiqueta" stroke={chartColors.axis} fontSize={11} />
                    <YAxis stroke={chartColors.axis} fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Growth" stroke="#5c8a72" fill="url(#gGrowth)" strokeWidth={2} isAnimationActive={false} />
                    <Area type="monotone" dataKey="Software" stroke="#3c5e99" fill="url(#gSoftware)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted mt-2">
                Se calcula desde la fecha de creación de cada tarea — va a ganar más sentido semana a semana a medida que se acumula historial.
              </p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Proyectos</h2>
            <div className="flex flex-col gap-3">
              {metricas.porProyecto.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.nombre}</p>
                      <p className="text-xs text-muted">
                        {p.frente} · {p.totalTareas} tareas · {p.atrasadas} atrasadas
                        {p.epics.length > 0 && ` · ${p.epics.length} épicas`}
                      </p>
                    </div>
                    <Semaforo nivel={nivelProyecto(p)} />
                  </div>
                  <ProgressBar
                    label="Avance"
                    value={p.completadas}
                    target={p.totalTareas}
                    formatValue={(n) => String(n)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
