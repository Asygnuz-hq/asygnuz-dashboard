"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { useMetricas } from "@/lib/kaneo/useMetricas";

const PRIORIDAD_LABEL: Record<string, string> = { urgent: "Urgente", high: "Alta" };

export default function CargaPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const { metricas, error, loading } = useMetricas();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Carga de trabajo por persona" subtitle="Quién tiene más, quién tiene menos, quién está atrasado." />
        <Link href="/metricas" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt">
          ← Vista ejecutiva
        </Link>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {metricas && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Personas con tareas activas" value={String(metricas.porPersona.length)} />
            <KpiCard label="Sin asignar" value={String(metricas.sinAsignar)} hint="Trabajo que nadie está viendo" />
            <KpiCard
              label="Persona con más carga"
              value={metricas.porPersona[0]?.nombre ?? "—"}
              hint={metricas.porPersona[0] ? `${metricas.porPersona[0].activas} tareas activas` : undefined}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Tareas activas por persona</h2>
            <div className="h-72 rounded-lg border border-border bg-surface p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas.porPersona} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" stroke={chartColors.axis} fontSize={12} />
                  <YAxis type="category" dataKey="nombre" stroke={chartColors.axis} fontSize={12} width={140} />
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                  />
                  <Bar dataKey="activas" name="Activas" fill="#3c5e99" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="atrasadas" name="Atrasadas" fill="#d9534f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Detalle por persona</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Persona</th>
                    <th className="text-right px-3 py-2">Activas</th>
                    <th className="text-right px-3 py-2">Atrasadas</th>
                    <th className="text-right px-3 py-2">Completadas</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.porPersona.map((p) => (
                    <tr key={p.nombre} className="border-t border-border">
                      <td className="px-3 py-2">{p.nombre}</td>
                      <td className="px-3 py-2 text-right">{p.activas}</td>
                      <td className={`px-3 py-2 text-right ${p.atrasadas > 0 ? "text-danger" : ""}`}>{p.atrasadas}</td>
                      <td className="px-3 py-2 text-right text-muted">{p.completadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {metricas.prioridadAltaEstancada.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Prioridad alta/urgente estancada en &quot;por hacer&quot;
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Tarea</th>
                      <th className="text-left px-3 py-2">Proyecto</th>
                      <th className="text-left px-3 py-2">Prioridad</th>
                      <th className="text-right px-3 py-2">Días sin mover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.prioridadAltaEstancada.map((t, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">{t.titulo}</td>
                        <td className="px-3 py-2 text-muted">{t.proyecto}</td>
                        <td className="px-3 py-2">{PRIORIDAD_LABEL[t.prioridad] ?? t.prioridad}</td>
                        <td className="px-3 py-2 text-right text-danger">{t.dias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
