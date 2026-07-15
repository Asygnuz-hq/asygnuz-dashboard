"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCOP, formatMonth, formatPercent } from "@/lib/format";

type HistoricoRow = {
  mes: string;
  ingresos_cop: number;
  gastos_cop: number;
  utilidad_neta_cop: number;
  margen_pct: number;
};

const PALETTE = ["#1d9e75", "#c9a227", "#d9534f", "#4f8fd9", "#a86cd9", "#d97706", "#6b7280", "#e2c799"];

export default function DashboardPage() {
  const [trm, setTrm] = useState(0);
  const [mesActivo, setMesActivo] = useState<string>("");
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<{ categoria: string; monto_cop: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: config } = await supabase.from("configuracion").select("*").eq("id", 1).single();
      const activeMes = config?.mes_activo ?? "";
      setTrm(config?.trm_actual ?? 0);
      setMesActivo(activeMes);

      const { data: hist } = await supabase
        .from("v_historico_mensual")
        .select("*")
        .order("mes", { ascending: true });
      setHistorico((hist as HistoricoRow[]) ?? []);

      const [{ data: variables }, { data: fijos }] = await Promise.all([
        supabase.from("gastos_variables").select("categoria, monto_cop").eq("mes", activeMes),
        supabase.from("gastos_fijos").select("categoria, monto_cop").eq("activo", true),
      ]);

      const totals = new Map<string, number>();
      [...(variables ?? []), ...(fijos ?? [])].forEach((row) => {
        const key = row.categoria || "Sin categoría";
        totals.set(key, (totals.get(key) ?? 0) + (row.monto_cop ?? 0));
      });
      setGastosPorCategoria(
        Array.from(totals.entries()).map(([categoria, monto_cop]) => ({ categoria, monto_cop }))
      );

      setLoading(false);
    }
    load();
  }, []);

  const mesKpis = useMemo(
    () => historico.find((h) => h.mes === mesActivo),
    [historico, mesActivo]
  );

  const chartData = useMemo(
    () =>
      historico.slice(-12).map((h) => ({
        mes: formatMonth(h.mes),
        Ingresos: h.ingresos_cop,
        Gastos: h.gastos_cop,
        Utilidad: h.utilidad_neta_cop,
      })),
    [historico]
  );

  if (loading) return <p className="text-muted">Cargando dashboard...</p>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard financiero" subtitle={`Mes activo: ${formatMonth(mesActivo)}`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="TRM del día" value={trm ? trm.toLocaleString("es-CO") : "-"} hint="COP/USD" />
        <KpiCard label="Ingresos del mes" value={formatCOP(mesKpis?.ingresos_cop ?? 0)} />
        <KpiCard label="Gastos del mes" value={formatCOP(mesKpis?.gastos_cop ?? 0)} />
        <KpiCard label="Utilidad neta" value={formatCOP(mesKpis?.utilidad_neta_cop ?? 0)} />
        <KpiCard label="Margen" value={formatPercent(mesKpis?.margen_pct ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium mb-3">Ingresos vs. Gastos por mes</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#322f28" />
              <XAxis dataKey="mes" stroke="#a89e8a" fontSize={12} />
              <YAxis stroke="#a89e8a" fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: "#171613", border: "1px solid #322f28", color: "#f2ead9" }}
                formatter={(value) => formatCOP(Number(value))}
              />
              <Bar dataKey="Ingresos" fill="#1d9e75" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#d9534f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium mb-3">Utilidad neta histórica</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#322f28" />
              <XAxis dataKey="mes" stroke="#a89e8a" fontSize={12} />
              <YAxis stroke="#a89e8a" fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: "#171613", border: "1px solid #322f28", color: "#f2ead9" }}
                formatter={(value) => formatCOP(Number(value))}
              />
              <Line type="monotone" dataKey="Utilidad" stroke="#1d9e75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
          <p className="text-sm font-medium mb-3">Gastos del mes activo por categoría</p>
          {gastosPorCategoria.length === 0 ? (
            <p className="text-sm text-muted">No hay gastos registrados para este mes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={gastosPorCategoria}
                  dataKey="monto_cop"
                  nameKey="categoria"
                  outerRadius={100}
                  label={(entry: unknown) => (entry as { categoria?: string }).categoria ?? ""}
                >
                  {gastosPorCategoria.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#171613", border: "1px solid #322f28", color: "#f2ead9" }}
                  formatter={(value) => formatCOP(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
