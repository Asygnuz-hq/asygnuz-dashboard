"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Reveal } from "@/components/Reveal";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { ESTADOS_CLIENTE } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Cliente", type: "text", required: true },
  { key: "tipo", label: "Tipo", type: "text" },
  { key: "estado", label: "Estado", type: "select", options: ESTADOS_CLIENTE, defaultValue: "Activo" },
  { key: "fecha_inicio", label: "Fecha Inicio", type: "date" },
  { key: "contacto", label: "Contacto", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

const ESTADO_COLOR: Record<string, string> = {
  Activo: "#5c8a72",
  "En riesgo": "#c9a227",
  Pausado: "#8fa8c7",
  Terminado: "#d9534f",
};

type Cliente = { id: string; nombre: string; estado: string };
type Rentabilidad = { cliente: string; ingresos_cop: number };

export default function ClientesPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rentabilidad, setRentabilidad] = useState<Rentabilidad[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("clientes").select("id, nombre, estado").is("eliminado_en", null),
      supabase.from("v_rentabilidad_cliente").select("cliente, ingresos_cop"),
    ]);
    setClientes((c as Cliente[]) ?? []);
    setRentabilidad((r as Rentabilidad[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const estadoCounts = useMemo(() => {
    const totals = new Map<string, number>();
    clientes.forEach((c) => totals.set(c.estado, (totals.get(c.estado) ?? 0) + 1));
    return Array.from(totals.entries()).map(([estado, cantidad]) => ({ estado, cantidad }));
  }, [clientes]);

  const ranking = useMemo(
    () =>
      rentabilidad
        .filter((r) => r.ingresos_cop > 0)
        .sort((a, b) => b.ingresos_cop - a.ingresos_cop)
        .slice(0, 10)
        .map((r) => ({
          nombre: r.cliente.length > 18 ? `${r.cliente.slice(0, 18)}…` : r.cliente,
          Ingresos: r.ingresos_cop,
        })),
    [rentabilidad]
  );

  const totalIngresos = rentabilidad.reduce((sum, r) => sum + (r.ingresos_cop ?? 0), 0);
  const activos = clientes.filter((c) => c.estado === "Activo").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Clientes"
        subtitle="Tu lista maestra de clientes. Haz clic en 'Ver' para su ficha completa: ingresos, cobros y actividades."
      />

      {!loading && clientes.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
            <KpiCard label="Clientes totales" value={String(clientes.length)} count={clientes.length} />
            <KpiCard label="Clientes activos" value={String(activos)} count={activos} />
            <KpiCard label="Ingresos vinculados" value={formatCOP(totalIngresos)} count={totalIngresos} formatCount={formatCOP} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal className="glass glass-hover rounded-2xl p-4" indice={0}>
              <p className="text-sm font-medium mb-3">Ranking de clientes por ingresos</p>
              {ranking.length === 0 ? (
                <p className="text-sm text-muted">Vincula ingresos a un cliente para ver el ranking.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, ranking.length * 36)}>
                  <BarChart data={ranking} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" stroke={chartColors.axis} fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                    <YAxis type="category" dataKey="nombre" stroke={chartColors.axis} fontSize={12} width={110} />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: chartColors.tooltipText,
                      }}
                      formatter={(value) => formatCOP(Number(value))}
                    />
                    <Bar dataKey="Ingresos" fill="#3c5e99" radius={[0, 4, 4, 0]} animationDuration={1400} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Reveal>

            <Reveal className="glass glass-hover rounded-2xl p-4" indice={1}>
              <p className="text-sm font-medium mb-3">Clientes por estado</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={estadoCounts} dataKey="cantidad" nameKey="estado" innerRadius={50} outerRadius={90} paddingAngle={2} animationDuration={1400} animationEasing="ease-out">
                    {estadoCounts.map((e, i) => (
                      <Cell key={i} fill={ESTADO_COLOR[e.estado] ?? "#8fa8c7"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      color: chartColors.tooltipText,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex flex-col gap-1 mt-2">
                {estadoCounts.map((e) => (
                  <li key={e.estado} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: ESTADO_COLOR[e.estado] ?? "#8fa8c7" }} />
                    <span className="flex-1 truncate">{e.estado}</span>
                    <span className="font-medium">{e.cantidad}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </>
      )}

      <DataTable
        table="clientes"
        columns={columns}
        orderBy="nombre"
        ascending
        hasCreatedBy
        detailBasePath="/clientes"
        onChange={load}
      />
    </div>
  );
}
