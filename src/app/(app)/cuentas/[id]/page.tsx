"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatUSD, formatEUR, formatMonth } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { TIPOS_MOVIMIENTO_MANUAL } from "@/lib/catalogs";

type Cuenta = { id: string; nombre: string; moneda: string; tipo: string; activa: boolean };
type Saldo = { saldo_actual: number };
type RendimientoRow = { fecha: string; monto: number };

const FORMATTERS: Record<string, (v: number) => string> = {
  COP: formatCOP,
  USD: formatUSD,
  EUR: formatEUR,
};

const movimientoColumns: ColumnDef[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_MOVIMIENTO_MANUAL, required: true, defaultValue: "Ingreso" },
  { key: "monto", label: "Monto", type: "number", required: true },
  { key: "tasa_cambio", label: "Tasa de Cambio (si aplica)", type: "number" },
  { key: "descripcion", label: "Descripción", type: "text" },
];

export default function CuentaDetailPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const params = useParams<{ id: string }>();
  const cuentaId = params.id;
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [rendimientos, setRendimientos] = useState<RendimientoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: c }, { data: s }, { data: r }] = await Promise.all([
      supabase.from("cuentas").select("*").eq("id", cuentaId).single(),
      supabase.from("v_saldo_cuentas").select("saldo_actual").eq("cuenta_id", cuentaId).maybeSingle(),
      supabase
        .from("movimientos_cuenta")
        .select("fecha, monto")
        .eq("cuenta_id", cuentaId)
        .eq("tipo", "Rendimiento")
        .is("eliminado_en", null)
        .order("fecha", { ascending: true }),
    ]);
    setCuenta(c as Cuenta);
    setSaldo(s as Saldo | null);
    setRendimientos((r as RendimientoRow[]) ?? []);
    setLoading(false);
  }, [cuentaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const rendimientosPorMes = useMemo(() => {
    const totals = new Map<string, number>();
    rendimientos.forEach((r) => {
      const mes = r.fecha.slice(0, 7);
      totals.set(mes, (totals.get(mes) ?? 0) + r.monto);
    });
    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, monto]) => ({ mes: formatMonth(`${mes}-01`), Rendimiento: monto }));
  }, [rendimientos]);

  const totalRendimientos = rendimientos.reduce((sum, r) => sum + r.monto, 0);

  if (loading) return <p className="text-muted">Cargando...</p>;
  if (!cuenta) return <p className="text-danger">Cuenta no encontrada.</p>;

  const formatMoneda = FORMATTERS[cuenta.moneda] ?? formatCOP;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={cuenta.nombre} subtitle={`${cuenta.tipo} · ${cuenta.moneda} · ${cuenta.activa ? "Activa" : "Inactiva"}`} />

      <div className="grid grid-cols-2 max-w-md gap-4">
        <KpiCard label="Saldo actual" value={formatMoneda(saldo?.saldo_actual ?? 0)} />
        <KpiCard label="Rendimientos acumulados" value={formatMoneda(totalRendimientos)} />
      </div>

      {rendimientosPorMes.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4 max-w-2xl">
          <p className="text-sm font-medium mb-3">Rendimientos por mes</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rendimientosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="mes" stroke={chartColors.axis} fontSize={12} />
              <YAxis stroke={chartColors.axis} fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  color: chartColors.tooltipText,
                }}
                formatter={(value) => formatMoneda(Number(value))}
              />
              <Bar dataKey="Rendimiento" fill="#5c8a72" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Movimientos</h2>
        <p className="text-xs text-muted mb-3">
          ¿Vas a comprar o vender {cuenta.moneda === "COP" ? "USD/EUR" : cuenta.moneda}? Usa el botón{" "}
          <Link href="/cuentas" className="text-accent underline">
            Cambio de Divisa
          </Link>{" "}
          en la página de Cuentas — ahí sí se descuenta de una cuenta y se suma a la otra automáticamente. Una fila
          aquí solo afecta esta cuenta. Usa &quot;Rendimiento&quot; para los intereses que te paga la cuenta.
        </p>
        <DataTable
          table="movimientos_cuenta"
          columns={movimientoColumns}
          filters={[{ column: "cuenta_id", value: cuentaId }]}
          fixedValues={{ cuenta_id: cuentaId }}
          orderBy="fecha"
          ascending={false}
          onChange={load}
        />
      </div>
    </div>
  );
}
