"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import { VincularCuenta, type ItemVinculable } from "@/components/VincularCuenta";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "tipo", label: "Tipo", type: "text" },
  { key: "activo_descripcion", label: "Activo / Descripción", type: "text", required: true },
  { key: "fecha_entrada", label: "Fecha Entrada", type: "date" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto_invertido", label: "Monto Invertido", type: "number" },
  { key: "trm_entrada", label: "TRM Entrada", type: "number" },
  { key: "monto_cop_entrada", label: "Equiv. COP (entrada)", type: "readonly-cop" },
  { key: "valor_actual_manual", label: "Valor Actual (manual)", type: "number" },
  { key: "trm_valoracion", label: "TRM Valoración", type: "number" },
  { key: "valor_cop_actual", label: "Valor COP Actual", type: "readonly-cop" },
  { key: "ganancia_perdida_cop", label: "Ganancia/Pérdida COP", type: "readonly-cop" },
  { key: "retorno_pct", label: "Retorno %", type: "readonly-percent" },
  { key: "estado", label: "Estado", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

const PALETTE = ["#183057", "#3c5e99", "#8fa8c7", "#c9a227", "#d9534f", "#5c8a72", "#8b6ba6", "#a8763e"];

type Inversion = {
  id: string;
  tipo: string | null;
  activo_descripcion: string;
  monto_cop_entrada: number;
  valor_cop_actual: number;
  ganancia_perdida_cop: number;
};

export default function InversionesPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("inversiones")
      .select("id, tipo, activo_descripcion, monto_cop_entrada, valor_cop_actual, ganancia_perdida_cop");
    setInversiones((data as Inversion[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const totalInvertido = inversiones.reduce((sum, i) => sum + (i.monto_cop_entrada ?? 0), 0);
  const totalActual = inversiones.reduce((sum, i) => sum + (i.valor_cop_actual ?? 0), 0);
  const gananciaTotal = totalActual - totalInvertido;
  const retornoTotal = totalInvertido > 0 ? gananciaTotal / totalInvertido : null;

  const composicion = useMemo(() => {
    const totals = new Map<string, number>();
    inversiones.forEach((i) => {
      const key = i.tipo || "Sin tipo";
      totals.set(key, (totals.get(key) ?? 0) + (i.valor_cop_actual ?? 0));
    });
    return Array.from(totals.entries())
      .map(([tipo, valor]) => ({ tipo, valor }))
      .filter((c) => c.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [inversiones]);

  const comparativo = useMemo(
    () =>
      inversiones
        .filter((i) => i.monto_cop_entrada > 0 || i.valor_cop_actual > 0)
        .map((i) => ({
          nombre: i.activo_descripcion.length > 16 ? `${i.activo_descripcion.slice(0, 16)}…` : i.activo_descripcion,
          Invertido: i.monto_cop_entrada,
          "Valor Actual": i.valor_cop_actual,
        })),
    [inversiones]
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Portafolio de inversiones"
        subtitle="El valor actual y la TRM de valoración se actualizan manualmente. Usa 'Vincular a cuenta' para que la inversión descuente tu caja real."
      />

      {!loading && inversiones.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total invertido" value={formatCOP(totalInvertido)} />
            <KpiCard label="Valor actual" value={formatCOP(totalActual)} />
            <KpiCard
              label="Ganancia / Pérdida"
              value={formatCOP(gananciaTotal)}
              hint={gananciaTotal >= 0 ? "En positivo" : "En negativo"}
            />
            <KpiCard label="Retorno total" value={retornoTotal !== null ? formatPercent(retornoTotal) : "-"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium mb-3">Composición del portafolio (valor actual)</p>
              {composicion.length === 0 ? (
                <p className="text-sm text-muted">Registra un valor actual para ver la composición.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={composicion} dataKey="valor" nameKey="tipo" innerRadius={55} outerRadius={100} paddingAngle={2}>
                      {composicion.map((_, i) => (
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
              )}
              <ul className="flex flex-col gap-1 mt-3">
                {composicion.map((c, i) => (
                  <li key={c.tipo} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="flex-1 truncate">{c.tipo}</span>
                    <span className="font-medium">{formatCOP(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium mb-3">Invertido vs. Valor actual por activo</p>
              <ResponsiveContainer width="100%" height={Math.max(260, comparativo.length * 40)}>
                <BarChart data={comparativo} layout="vertical" margin={{ left: 10 }}>
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
                  <Bar dataKey="Invertido" fill="#8fa8c7" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Valor Actual" fill="#3c5e99" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <DataTable
        table="inversiones"
        columns={columns}
        orderBy="fecha_entrada"
        ascending={false}
        onChange={load}
        rowActions={(row, reload) => (
          <VincularCuenta
            key={row.id}
            item={{
              id: row.id,
              moneda: row.moneda,
              monto: row.monto_invertido,
              trm_aplicada: row.trm_entrada,
              fecha: row.fecha_entrada,
              concepto: row.activo_descripcion,
              cuenta_id: row.cuenta_id,
            } as ItemVinculable}
            table="inversiones"
            fkColumn="inversion_id"
            pregunta="¿Con qué cuenta hiciste esta inversión?"
            onDone={reload}
          />
        )}
      />
    </div>
  );
}
