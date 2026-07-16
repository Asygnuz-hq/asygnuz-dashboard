"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { CambioDivisa } from "@/components/CambioDivisa";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatUSD } from "@/lib/format";
import { TIPOS_CUENTA } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Cuenta", type: "text", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: ["COP", "USD"], required: true, defaultValue: "COP" },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_CUENTA, defaultValue: "Banco" },
  { key: "saldo_inicial", label: "Saldo Inicial", type: "number" },
  { key: "activa", label: "Activa", type: "boolean", defaultValue: true },
  { key: "notas", label: "Notas", type: "text" },
];

type Saldo = { cuenta_id: string; cuenta: string; moneda: string; tipo: string; activa: boolean; saldo_actual: number };
type MovimientoFx = { tipo: string; monto: number; tasa_cambio: number | null };

type FxResumen = {
  usdComprado: number;
  tasaCompraProm: number | null;
  usdVendido: number;
  tasaVentaProm: number | null;
  gananciaRealizada: number | null;
};

export default function CuentasPage() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [fx, setFx] = useState<FxResumen | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSaldos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("v_saldo_cuentas").select("*").order("cuenta", { ascending: true });
    setSaldos((data as Saldo[]) ?? []);
    setLoading(false);
  }, []);

  const loadFx = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("movimientos_cuenta")
      .select("tipo, monto, tasa_cambio")
      .in("tipo", ["Compra USD", "Venta USD"])
      .not("tasa_cambio", "is", null);

    const movimientos = (data as MovimientoFx[]) ?? [];
    const compras = movimientos.filter((m) => m.tipo === "Compra USD");
    const ventas = movimientos.filter((m) => m.tipo === "Venta USD");

    const usdComprado = compras.reduce((sum, m) => sum + m.monto, 0);
    const usdVendido = ventas.reduce((sum, m) => sum + m.monto, 0);
    const tasaCompraProm =
      usdComprado > 0 ? compras.reduce((sum, m) => sum + m.monto * (m.tasa_cambio ?? 0), 0) / usdComprado : null;
    const tasaVentaProm =
      usdVendido > 0 ? ventas.reduce((sum, m) => sum + m.monto * (m.tasa_cambio ?? 0), 0) / usdVendido : null;

    const volumenRealizado = Math.min(usdComprado, usdVendido);
    const gananciaRealizada =
      volumenRealizado > 0 && tasaCompraProm !== null && tasaVentaProm !== null
        ? volumenRealizado * (tasaVentaProm - tasaCompraProm)
        : null;

    setFx({ usdComprado, tasaCompraProm, usdVendido, tasaVentaProm, gananciaRealizada });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSaldos();
    loadFx();
  }, [loadSaldos, loadFx]);

  const totalCOP = saldos.filter((s) => s.moneda === "COP" && s.activa).reduce((sum, s) => sum + s.saldo_actual, 0);
  const totalUSD = saldos.filter((s) => s.moneda === "USD" && s.activa).reduce((sum, s) => sum + s.saldo_actual, 0);

  function refreshAll() {
    loadSaldos();
    loadFx();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Cuentas y Caja" subtitle="Tus bancos, billeteras y efectivo. Haz clic en 'Ver' para su bitácora de movimientos." />

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Caja total COP</p>
          <p className="text-2xl font-bold">{formatCOP(totalCOP)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Caja total USD</p>
          <p className="text-2xl font-bold">{formatUSD(totalUSD)}</p>
        </div>
      </div>

      <CambioDivisa onDone={refreshAll} />

      {fx && (fx.usdComprado > 0 || fx.usdVendido > 0) && (
        <div className="rounded-lg border border-border bg-surface p-4 max-w-2xl">
          <p className="text-sm font-medium mb-3">Rentabilidad de cambio de divisa</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted">USD comprados</p>
              <p className="font-medium">{formatUSD(fx.usdComprado)}</p>
              {fx.tasaCompraProm !== null && (
                <p className="text-xs text-muted">a {fx.tasaCompraProm.toLocaleString("es-CO", { maximumFractionDigits: 0 })} prom.</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted">USD vendidos</p>
              <p className="font-medium">{formatUSD(fx.usdVendido)}</p>
              {fx.tasaVentaProm !== null && (
                <p className="text-xs text-muted">a {fx.tasaVentaProm.toLocaleString("es-CO", { maximumFractionDigits: 0 })} prom.</p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted">Ganancia realizada (sobre lo ya vendido)</p>
              <p className={`font-bold ${fx.gananciaRealizada === null ? "" : fx.gananciaRealizada >= 0 ? "text-accent-bright" : "text-danger"}`}>
                {fx.gananciaRealizada !== null ? formatCOP(fx.gananciaRealizada) : "Aún no has vendido USD"}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && saldos.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Moneda</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Saldo Actual</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.cuenta_id} className="border-t border-border">
                  <td className="px-3 py-2">{s.cuenta}</td>
                  <td className="px-3 py-2">{s.tipo}</td>
                  <td className="px-3 py-2">{s.moneda}</td>
                  <td className="px-3 py-2">{s.activa ? "Activa" : "Inactiva"}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {s.moneda === "USD" ? formatUSD(s.saldo_actual) : formatCOP(s.saldo_actual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Administrar cuentas</h2>
        <DataTable
          table="cuentas"
          columns={columns}
          orderBy="nombre"
          ascending
          detailBasePath="/cuentas"
          onChange={refreshAll}
        />
      </div>
    </div>
  );
}
