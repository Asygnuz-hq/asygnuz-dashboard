"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { CambioDivisa } from "@/components/CambioDivisa";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatUSD, formatEUR } from "@/lib/format";
import { TIPOS_CUENTA, MONEDAS_CUENTA } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Cuenta", type: "text", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS_CUENTA, required: true, defaultValue: "COP" },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_CUENTA, defaultValue: "Banco" },
  { key: "saldo_inicial", label: "Saldo Inicial", type: "number" },
  { key: "activa", label: "Activa", type: "boolean", defaultValue: true },
  { key: "notas", label: "Notas", type: "text" },
];

const FORMATTERS: Record<string, (v: number) => string> = {
  COP: formatCOP,
  USD: formatUSD,
  EUR: formatEUR,
};

type Saldo = { cuenta_id: string; cuenta: string; moneda: string; tipo: string; activa: boolean; saldo_actual: number };
type MovimientoFx = { tipo: string; monto: number; tasa_cambio: number | null };

type FxResumen = {
  moneda: string;
  comprado: number;
  tasaCompraProm: number | null;
  vendido: number;
  tasaVentaProm: number | null;
  gananciaRealizada: number | null;
};

export default function CuentasPage() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [fx, setFx] = useState<FxResumen[]>([]);
  const [rendimientos, setRendimientos] = useState<Record<string, number>>({});
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
      .in("tipo", ["Compra USD", "Venta USD", "Compra EUR", "Venta EUR"])
      .not("tasa_cambio", "is", null);

    const movimientos = (data as MovimientoFx[]) ?? [];
    const resumen: FxResumen[] = ["USD", "EUR"].map((moneda) => {
      const compras = movimientos.filter((m) => m.tipo === `Compra ${moneda}`);
      const ventas = movimientos.filter((m) => m.tipo === `Venta ${moneda}`);
      const comprado = compras.reduce((sum, m) => sum + m.monto, 0);
      const vendido = ventas.reduce((sum, m) => sum + m.monto, 0);
      const tasaCompraProm =
        comprado > 0 ? compras.reduce((sum, m) => sum + m.monto * (m.tasa_cambio ?? 0), 0) / comprado : null;
      const tasaVentaProm =
        vendido > 0 ? ventas.reduce((sum, m) => sum + m.monto * (m.tasa_cambio ?? 0), 0) / vendido : null;
      const volumenRealizado = Math.min(comprado, vendido);
      const gananciaRealizada =
        volumenRealizado > 0 && tasaCompraProm !== null && tasaVentaProm !== null
          ? volumenRealizado * (tasaVentaProm - tasaCompraProm)
          : null;
      return { moneda, comprado, tasaCompraProm, vendido, tasaVentaProm, gananciaRealizada };
    });
    setFx(resumen.filter((r) => r.comprado > 0 || r.vendido > 0));
  }, []);

  const loadRendimientos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("movimientos_cuenta")
      .select("monto, cuentas(moneda)")
      .eq("tipo", "Rendimiento");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data as any[]) ?? [];
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      const moneda = r.cuentas?.moneda ?? "COP";
      totals[moneda] = (totals[moneda] ?? 0) + (r.monto ?? 0);
    });
    setRendimientos(totals);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSaldos();
    loadFx();
    loadRendimientos();
  }, [loadSaldos, loadFx, loadRendimientos]);

  function refreshAll() {
    loadSaldos();
    loadFx();
    loadRendimientos();
  }

  const totalesPorMoneda = MONEDAS_CUENTA.map((moneda) => ({
    moneda,
    total: saldos.filter((s) => s.moneda === moneda && s.activa).reduce((sum, s) => sum + s.saldo_actual, 0),
  }));

  const hayRendimientos = Object.values(rendimientos).some((v) => v > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Cuentas y Caja" subtitle="Tus bancos, billeteras y efectivo. Haz clic en 'Ver' para su bitácora de movimientos." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
        {totalesPorMoneda.map(({ moneda, total }) => (
          <div key={moneda} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Caja total {moneda}</p>
            <p className="text-2xl font-bold">{FORMATTERS[moneda](total)}</p>
          </div>
        ))}
      </div>

      <CambioDivisa onDone={refreshAll} />

      {hayRendimientos && (
        <div className="rounded-lg border border-border bg-surface p-4 max-w-xl">
          <p className="text-sm font-medium mb-3">Rendimientos acumulados</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {MONEDAS_CUENTA.map((moneda) => (
              <div key={moneda}>
                <p className="text-xs text-muted">{moneda}</p>
                <p className="font-medium text-accent-bright">{FORMATTERS[moneda](rendimientos[moneda] ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {fx.length > 0 && (
        <div className="flex flex-col gap-4">
          {fx.map((r) => (
            <div key={r.moneda} className="rounded-lg border border-border bg-surface p-4 max-w-2xl">
              <p className="text-sm font-medium mb-3">Rentabilidad de cambio de divisa ({r.moneda})</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted">{r.moneda} comprados</p>
                  <p className="font-medium">{FORMATTERS[r.moneda](r.comprado)}</p>
                  {r.tasaCompraProm !== null && (
                    <p className="text-xs text-muted">a {r.tasaCompraProm.toLocaleString("es-CO", { maximumFractionDigits: 0 })} prom.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted">{r.moneda} vendidos</p>
                  <p className="font-medium">{FORMATTERS[r.moneda](r.vendido)}</p>
                  {r.tasaVentaProm !== null && (
                    <p className="text-xs text-muted">a {r.tasaVentaProm.toLocaleString("es-CO", { maximumFractionDigits: 0 })} prom.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted">Ganancia realizada (sobre lo ya vendido)</p>
                  <p className={`font-bold ${r.gananciaRealizada === null ? "" : r.gananciaRealizada >= 0 ? "text-accent-bright" : "text-danger"}`}>
                    {r.gananciaRealizada !== null ? formatCOP(r.gananciaRealizada) : `Aún no has vendido ${r.moneda}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
                    {(FORMATTERS[s.moneda] ?? formatCOP)(s.saldo_actual)}
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
