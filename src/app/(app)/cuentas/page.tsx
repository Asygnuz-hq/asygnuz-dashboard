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

type Bolsillo = { nombre: string; saldo: number; tasaReferencia: number | null };

type FxResumen = {
  moneda: string;
  comprado: number;
  tasaCompraProm: number | null;
  vendido: number;
  tasaVentaProm: number | null;
  gananciaRealizada: number | null;
  bolsillos: Bolsillo[];
  saldoSinClasificar: number;
};

export default function CuentasPage() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [fx, setFx] = useState<FxResumen[]>([]);
  const [rendimientos, setRendimientos] = useState<Record<string, number>>({});
  const [tasasActuales, setTasasActuales] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  const loadTasasActuales = useCallback(async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      const copPorUsd = data?.rates?.COP ?? null;
      const eurPorUsd = data?.rates?.EUR ?? null;
      setTasasActuales({
        USD: copPorUsd,
        EUR: copPorUsd && eurPorUsd ? copPorUsd / eurPorUsd : null,
      });
    } catch {
      setTasasActuales({});
    }
  }, []);

  const loadSaldos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("v_saldo_cuentas").select("*").order("cuenta", { ascending: true });
    setSaldos((data as Saldo[]) ?? []);
    setLoading(false);
  }, []);

  const loadFx = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: saldosData }] = await Promise.all([
      supabase
        .from("movimientos_cuenta")
        .select("tipo, monto, tasa_cambio, cuentas(moneda)")
        .in("tipo", ["Compra USD", "Venta USD", "Compra EUR", "Venta EUR", "Ingreso", "Rendimiento"])
        .is("eliminado_en", null),
      supabase.from("v_saldo_cuentas").select("moneda, activa, saldo_actual"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movimientos = (data as any[]) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saldosPorCuenta = (saldosData as any[]) ?? [];

    const resumen: FxResumen[] = ["USD", "EUR"].map((moneda) => {
      const compras = movimientos.filter((m) => m.tipo === `Compra ${moneda}` && m.tasa_cambio !== null);
      const ventas = movimientos.filter((m) => m.tipo === `Venta ${moneda}` && m.tasa_cambio !== null);
      // Pagos de clientes que llegaron directo a una cuenta en esta moneda,
      // con la TRM oficial del día de pago ya registrada (flujo "Marcar cobrado").
      const pagosCliente = movimientos.filter(
        (m) => m.tipo === "Ingreso" && m.cuentas?.moneda === moneda && m.tasa_cambio !== null
      );
      const rendimientos = movimientos.filter((m) => m.tipo === "Rendimiento" && m.cuentas?.moneda === moneda);

      const comprado = compras.reduce((sum, m) => sum + m.monto, 0);
      const vendido = ventas.reduce((sum, m) => sum + m.monto, 0);
      const tasaCompraProm =
        comprado > 0 ? compras.reduce((sum, m) => sum + m.monto * m.tasa_cambio, 0) / comprado : null;
      const tasaVentaProm =
        vendido > 0 ? ventas.reduce((sum, m) => sum + m.monto * m.tasa_cambio, 0) / vendido : null;
      const volumenRealizado = Math.min(comprado, vendido);
      const gananciaRealizada =
        volumenRealizado > 0 && tasaCompraProm !== null && tasaVentaProm !== null
          ? volumenRealizado * (tasaVentaProm - tasaCompraProm)
          : null;

      const saldoComprados = Math.max(comprado - vendido, 0);
      const totalClientes = pagosCliente.reduce((sum, m) => sum + m.monto, 0);
      const tasaClientesProm =
        totalClientes > 0 ? pagosCliente.reduce((sum, m) => sum + m.monto * m.tasa_cambio, 0) / totalClientes : null;
      const totalRendimientos = rendimientos.reduce((sum, m) => sum + m.monto, 0);

      const saldoCuentaTotal = saldosPorCuenta
        .filter((s) => s.moneda === moneda && s.activa)
        .reduce((sum, s) => sum + s.saldo_actual, 0);
      const saldoClasificado = saldoComprados + totalClientes + totalRendimientos;
      const saldoSinClasificar = Math.max(saldoCuentaTotal - saldoClasificado, 0);

      const bolsillos: Bolsillo[] = [
        { nombre: "Comprados con pesos", saldo: saldoComprados, tasaReferencia: tasaCompraProm },
        { nombre: "Pagos de clientes", saldo: totalClientes, tasaReferencia: tasaClientesProm },
        { nombre: "Rendimientos del banco", saldo: totalRendimientos, tasaReferencia: 0 },
      ].filter((b) => b.saldo > 0);

      return {
        moneda,
        comprado,
        tasaCompraProm,
        vendido,
        tasaVentaProm,
        gananciaRealizada,
        bolsillos,
        saldoSinClasificar,
      };
    });
    setFx(resumen.filter((r) => r.comprado > 0 || r.vendido > 0 || r.bolsillos.length > 0));
  }, []);

  const loadRendimientos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("movimientos_cuenta")
      .select("monto, cuentas(moneda)")
      .eq("tipo", "Rendimiento")
      .is("eliminado_en", null);

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
    loadTasasActuales();
  }, [loadSaldos, loadFx, loadRendimientos, loadTasasActuales]);

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

              {r.bolsillos.length > 0 &&
                (() => {
                  const tasaActual = tasasActuales[r.moneda] ?? null;
                  const gananciaTotal =
                    tasaActual !== null
                      ? r.bolsillos.reduce((sum, b) => sum + b.saldo * (tasaActual - (b.tasaReferencia ?? 0)), 0)
                      : null;
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-baseline justify-between mb-3">
                        <p className="text-xs text-muted">
                          Si vendieras hoy tus {r.moneda}, a tasa de mercado en vivo de{" "}
                          {tasaActual !== null ? tasaActual.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : "no disponible"}
                        </p>
                        <p className={`font-bold ${gananciaTotal === null ? "" : gananciaTotal >= 0 ? "text-accent-bright" : "text-danger"}`}>
                          {gananciaTotal !== null ? formatCOP(gananciaTotal) : "No disponible"}
                        </p>
                      </div>
                      <ul className="flex flex-col gap-2">
                        {r.bolsillos.map((b) => {
                          const ganancia =
                            tasaActual !== null ? b.saldo * (tasaActual - (b.tasaReferencia ?? 0)) : null;
                          const positivo = ganancia !== null && ganancia >= 0;
                          return (
                            <li key={b.nombre} className="flex items-center gap-3 text-xs">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${ganancia === null ? "bg-muted" : positivo ? "bg-accent-bright" : "bg-danger"}`} />
                              <span className="flex-1">{b.nombre}</span>
                              <span className="text-muted tabular-nums">{FORMATTERS[r.moneda](b.saldo)}</span>
                              <span className="text-muted tabular-nums w-24">
                                {b.tasaReferencia !== null ? `ref. ${b.tasaReferencia.toLocaleString("es-CO", { maximumFractionDigits: 0 })}` : "sin tasa"}
                              </span>
                              <span className={`font-medium tabular-nums w-28 text-right ${ganancia === null ? "text-muted" : positivo ? "text-accent-bright" : "text-danger"}`}>
                                {ganancia !== null ? formatCOP(ganancia) : "-"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      {r.saldoSinClasificar > 0 && (
                        <p className="text-xs text-muted mt-2">
                          + {FORMATTERS[r.moneda](r.saldoSinClasificar)} sin tasa de referencia registrada (saldo previo a
                          este sistema, o movimientos manuales sin tasa) — no se incluye arriba.
                        </p>
                      )}
                      <p className="text-xs text-muted mt-2">
                        Esto es solo tu propia matemática de costo vs. mercado, no es asesoría de inversión.
                      </p>
                    </div>
                  );
                })()}
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
