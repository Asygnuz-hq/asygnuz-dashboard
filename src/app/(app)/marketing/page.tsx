"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Reveal } from "@/components/Reveal";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { PLATAFORMAS_MARKETING, TIPOS_RESULTADO_MARKETING, ESTADOS_CAMPANA, MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Campaña", type: "text", required: true },
  { key: "plataforma", label: "Plataforma", type: "select", options: PLATAFORMAS_MARKETING, defaultValue: "Meta Ads" },
  { key: "fecha_inicio", label: "Fecha Inicio", type: "date" },
  { key: "fecha_fin", label: "Fecha Fin", type: "date" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, defaultValue: "COP" },
  { key: "inversion", label: "Inversión", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "inversion_cop", label: "Inversión COP", type: "readonly-cop" },
  { key: "resultado_tipo", label: "Resultado", type: "select", options: TIPOS_RESULTADO_MARKETING, defaultValue: "Leads" },
  { key: "resultado_cantidad", label: "Cantidad Resultado", type: "number" },
  { key: "ingresos_generados_cop", label: "Ingresos Generados COP", type: "number" },
  { key: "estado", label: "Estado", type: "select", options: ESTADOS_CAMPANA, defaultValue: "Activa" },
  { key: "notas", label: "Notas", type: "text" },
];

const PALETTE = ["#183057", "#3c5e99", "#8fa8c7", "#c9a227", "#d9534f", "#5c8a72", "#8b6ba6", "#a8763e"];

type Resumen = { plataforma: string; inversion_cop: number; roi_pct: number | null };

export default function MarketingPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("v_roi_campanas").select("plataforma, inversion_cop, roi_pct");
    setResumen((data as Resumen[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const totalInvertido = resumen.reduce((sum, r) => sum + (r.inversion_cop ?? 0), 0);
  const roiValidos = resumen.filter((r) => r.roi_pct !== null).map((r) => r.roi_pct as number);
  const roiPromedio = roiValidos.length > 0 ? roiValidos.reduce((a, b) => a + b, 0) / roiValidos.length : null;

  const inversionPorPlataforma = useMemo(() => {
    const totals = new Map<string, number>();
    resumen.forEach((r) => totals.set(r.plataforma, (totals.get(r.plataforma) ?? 0) + (r.inversion_cop ?? 0)));
    return Array.from(totals.entries())
      .map(([plataforma, valor]) => ({ plataforma, valor }))
      .filter((p) => p.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [resumen]);

  const roiPorPlataforma = useMemo(() => {
    const groups = new Map<string, number[]>();
    resumen.forEach((r) => {
      if (r.roi_pct === null) return;
      const arr = groups.get(r.plataforma) ?? [];
      arr.push(r.roi_pct);
      groups.set(r.plataforma, arr);
    });
    return Array.from(groups.entries()).map(([plataforma, values]) => ({
      plataforma,
      "ROI promedio": (values.reduce((a, b) => a + b, 0) / values.length) * 100,
    }));
  }, [resumen]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Marketing"
        subtitle="Registra cada campaña, lo que invertiste y lo que trajo de vuelta. El ROI se calcula solo."
      />

      {!loading && resumen.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
            <KpiCard label="Total invertido" value={formatCOP(totalInvertido)} count={totalInvertido} formatCount={formatCOP} />
            <KpiCard label="Campañas registradas" value={String(resumen.length)} count={resumen.length} />
            <KpiCard
              label="ROI promedio"
              value={roiPromedio !== null ? formatPercent(roiPromedio) : "-"}
              count={(roiPromedio ?? 0) * 100}
              formatCount={(n) => (roiPromedio !== null ? formatPercent(n / 100) : "-")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal className="glass glass-hover rounded-2xl p-4" indice={0}>
              <p className="text-sm font-medium mb-3">Inversión por plataforma</p>
              {inversionPorPlataforma.length === 0 ? (
                <p className="text-sm text-muted">Sin inversión registrada aún.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={inversionPorPlataforma} dataKey="valor" nameKey="plataforma" innerRadius={50} outerRadius={90} paddingAngle={2} animationDuration={1400} animationEasing="ease-out">
                        {inversionPorPlataforma.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: chartColors.tooltipBg,
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          color: chartColors.tooltipText,
                        }}
                        formatter={(value) => formatCOP(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex flex-col gap-1 mt-2">
                    {inversionPorPlataforma.map((p, i) => (
                      <li key={p.plataforma} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className="flex-1 truncate">{p.plataforma}</span>
                        <span className="font-medium">{formatCOP(p.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Reveal>

            <Reveal className="glass glass-hover rounded-2xl p-4" indice={1}>
              <p className="text-sm font-medium mb-3">ROI promedio por plataforma</p>
              {roiPorPlataforma.length === 0 ? (
                <p className="text-sm text-muted">Registra ingresos generados en una campaña para ver el ROI.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={roiPorPlataforma}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="plataforma" stroke={chartColors.axis} fontSize={12} />
                    <YAxis stroke={chartColors.axis} fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: chartColors.tooltipText,
                      }}
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                    <Bar dataKey="ROI promedio" fill="#3c5e99" radius={[4, 4, 0, 0]} animationDuration={1400} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Reveal>
          </div>
        </>
      )}

      <DataTable
        table="campanas_marketing"
        columns={columns}
        orderBy="fecha_inicio"
        ascending={false}
        onChange={load}
      />
    </div>
  );
}
