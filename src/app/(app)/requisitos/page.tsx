"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { useRequisitos } from "@/lib/kaneo/useRequisitos";
import { CHART_COLORS, useTheme } from "@/lib/useTheme";

const TRAZ_COLOR: Record<string, string> = {
  inicio: "#8b93a6",
  cotizacion: "#c9a227",
  desarrollo: "#3c5e99",
  pruebas: "#7c5cbf",
  finalizado: "#1d9e75",
  bloqueado: "#d9534f",
};

function IndicadorEnVivo({ actualizando }: { actualizando: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          actualizando ? "bg-accent-bright animate-pulse" : "bg-emerald-500"
        }`}
      />
      {actualizando ? "Actualizando…" : "En vivo · se refresca solo cada 2 min"}
    </div>
  );
}

export default function RequisitosPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const { data, error, loading, actualizando, recargar } = useRequisitos();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Requisitos de Negocio"
          subtitle="Avance y trazabilidad de los Requisitos de Negocio, leído directo de Kaneo. Se crean y editan dentro de Kaneo (tipo de tarea “Requisito de Negocio”), acá solo se miden."
        />
        <div className="flex flex-col items-end gap-1">
          <IndicadorEnVivo actualizando={actualizando} />
          <button
            type="button"
            onClick={recargar}
            disabled={loading || actualizando}
            className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt disabled:opacity-50"
          >
            Actualizar ahora
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Cargando Requisitos de Negocio de Kaneo…</p>}
      {error && (
        <p className="text-sm text-danger">
          {error}. Revisá que Kaneo esté arriba.
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Requisitos" value={String(data.totalRequisitos)} />
            <KpiCard label="Historias de usuario" value={String(data.totalHistorias)} />
            <KpiCard
              label="Avance real (prom.)"
              value={`${data.avanceGlobalReal}%`}
              hint={`Planificado ${data.avanceGlobalPlan}%`}
            />
            <KpiCard
              label="Atrasados"
              value={String(data.atrasados)}
              hint="Vencidos y por debajo del 100%"
              accentClassName={
                data.atrasados > 0 ? "bg-danger/10 border-danger/40" : undefined
              }
            />
          </div>

          {data.totalRequisitos > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Requisitos por estado de trazabilidad
              </h2>
              <div className="h-56 rounded-lg border border-border bg-surface p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.porTrazabilidad}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} />
                    <YAxis
                      stroke={chartColors.axis}
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: chartColors.tooltipText,
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {data.porTrazabilidad.map((s) => (
                        <Cell key={s.estado} fill={TRAZ_COLOR[s.estado] ?? "#8b93a6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
              Detalle por requisito
            </h2>
            {data.requisitos.length === 0 && (
              <p className="text-sm text-muted">
                No hay Requisitos de Negocio en Kaneo todavía. Creá uno en Kaneo eligiendo el
                tipo “Requisito de Negocio” y agregá las historias de usuario como subtareas.
              </p>
            )}
            {data.requisitos.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {r.numero != null && (
                    <span className="text-xs font-mono text-muted">#{r.numero}</span>
                  )}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize"
                    style={{
                      backgroundColor: `${TRAZ_COLOR[r.trazabilidad] ?? "#8b93a6"}22`,
                      color: TRAZ_COLOR[r.trazabilidad] ?? "#8b93a6",
                    }}
                  >
                    {r.trazabilidad}
                  </span>
                  <span className="text-[10px] text-muted">{r.proyecto}</span>
                  {r.fase && <span className="text-[10px] text-muted">· {r.fase}</span>}
                  {r.plataforma && (
                    <span className="text-[10px] text-muted">· {r.plataforma}</span>
                  )}
                  {r.atrasado && (
                    <span className="text-[10px] font-medium text-danger">· atrasado</span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">{r.titulo}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.historiasHechas}/{r.totalHistorias} historias entregadas
                    {r.fechaFin &&
                      ` · vence ${new Date(r.fechaFin).toLocaleDateString("es-CO")}`}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>Planificado {r.plannedPct}%</span>
                    <span>Ejecutado {r.executedPct ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-alt overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent-bright/25"
                      style={{ width: `${Math.min(100, r.plannedPct)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500"
                      style={{ width: `${Math.min(100, r.executedPct ?? 0)}%` }}
                    />
                  </div>
                </div>

                {r.totalHistorias > 0 && (
                  <ProgressBar
                    label="Historias"
                    value={r.historiasHechas}
                    target={r.totalHistorias}
                    formatValue={(n) => String(n)}
                  />
                )}
              </div>
            ))}
          </div>

          {data.generadoEn && (
            <p className="text-[10px] text-muted">
              Generado {new Date(data.generadoEn).toLocaleString("es-CO")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
