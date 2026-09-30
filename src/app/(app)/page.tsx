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
import { Reveal } from "@/components/Reveal";
import { ProgressBar } from "@/components/ProgressBar";
import { Semaforo, calcularSemaforo } from "@/components/Semaforo";
import { formatCOP, formatUSD, formatEUR, formatMonth, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";

const FORMATTERS_MONEDA: Record<string, (v: number) => string> = {
  COP: formatCOP,
  USD: formatUSD,
  EUR: formatEUR,
};

type HistoricoRow = {
  mes: string;
  ingresos_cop: number;
  gastos_cop: number;
  utilidad_neta_cop: number;
  margen_pct: number;
};

type IngresoVencido = {
  id: string;
  cliente: string;
  monto_cop: number;
  fecha_pago_esperada: string;
  dias_vencido: number;
};

const PALETTE = ["#183057", "#3c5e99", "#8fa8c7", "#c9a227", "#d9534f", "#5c8a72", "#8b6ba6", "#a8763e"];

export default function DashboardPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const [trm, setTrm] = useState(0);
  const [mesActivo, setMesActivo] = useState<string>("");
  const [metaIngresos, setMetaIngresos] = useState(0);
  const [metaMargen, setMetaMargen] = useState(0);
  const [ingresosPendientes, setIngresosPendientes] = useState(0);
  const [gastosFijosTotal, setGastosFijosTotal] = useState(0);
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<{ categoria: string; monto_cop: number }[]>([]);
  const [cajaTotalCop, setCajaTotalCop] = useState(0);
  const [cajaPorMoneda, setCajaPorMoneda] = useState<Record<string, number>>({});
  const [topCliente, setTopCliente] = useState<{ nombre: string; pct: number } | null>(null);
  const [carteraVencida, setCarteraVencida] = useState<IngresoVencido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: config } = await supabase.from("configuracion").select("*").maybeSingle();
      const activeMes = config?.mes_activo ?? "";
      setTrm(config?.trm_actual ?? 0);
      setMesActivo(activeMes);
      setMetaIngresos(config?.meta_ingresos_cop ?? 0);
      setMetaMargen(config?.meta_margen_pct ?? 0);

      const { data: hist } = await supabase
        .from("v_historico_mensual")
        .select("*")
        .order("mes", { ascending: true });
      setHistorico((hist as HistoricoRow[]) ?? []);

      const [{ data: variables }, { data: fijos }, { data: pendientes }, { data: saldos }, { data: ingresosCliente }] =
        await Promise.all([
          supabase.from("gastos_variables").select("categoria, monto_cop").eq("mes", activeMes).is("eliminado_en", null),
          supabase.from("gastos_fijos").select("categoria, monto_cop").eq("activo", true).is("eliminado_en", null),
          supabase
            .from("ingresos")
            .select("id, monto_cop, fecha_pago_esperada, cliente, clientes(nombre)")
            .eq("estado", "Pendiente")
            .is("eliminado_en", null),
          supabase.from("v_saldo_cuentas").select("moneda, activa, saldo_actual"),
          supabase
            .from("ingresos")
            .select("monto_cop, cliente, clientes(nombre)")
            .not("cliente_id", "is", null)
            .is("eliminado_en", null),
        ]);

      setGastosFijosTotal((fijos ?? []).reduce((sum, g) => sum + (g.monto_cop ?? 0), 0));
      setIngresosPendientes((pendientes ?? []).reduce((sum, i) => sum + (i.monto_cop ?? 0), 0));

      const trmOficial = config?.trm_actual ?? 0;

      const porMoneda: Record<string, number> = { COP: 0, USD: 0, EUR: 0 };
      (saldos ?? [])
        .filter((s) => s.activa)
        .forEach((s) => {
          porMoneda[s.moneda] = (porMoneda[s.moneda] ?? 0) + s.saldo_actual;
        });
      setCajaPorMoneda(porMoneda);

      // Para el total consolidado en COP: USD usa la TRM oficial (config.trm_actual,
      // la actualiza el cron diario). EUR no tiene fuente oficial integrada todavía,
      // así que se aproxima con la tasa de mercado en vivo — solo para este total.
      let eurCop = 0;
      if (porMoneda.EUR > 0) {
        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          const data = await res.json();
          const copPorUsd = data?.rates?.COP;
          const eurPorUsd = data?.rates?.EUR;
          eurCop = copPorUsd && eurPorUsd ? copPorUsd / eurPorUsd : 0;
        } catch {
          eurCop = 0;
        }
      }

      const caja = porMoneda.COP + porMoneda.USD * trmOficial + porMoneda.EUR * eurCop;
      setCajaTotalCop(caja);

      const hoy = new Date().toISOString().slice(0, 10);
      const vencidos = (pendientes ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((i: any) => i.fecha_pago_esperada && i.fecha_pago_esperada < hoy)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((i: any) => ({
          id: i.id,
          cliente: i.clientes?.nombre ?? i.cliente,
          monto_cop: i.monto_cop,
          fecha_pago_esperada: i.fecha_pago_esperada,
          dias_vencido: Math.floor(
            (new Date(hoy).getTime() - new Date(i.fecha_pago_esperada).getTime()) / 86_400_000
          ),
        }))
        .sort((a, b) => b.dias_vencido - a.dias_vencido);
      setCarteraVencida(vencidos.slice(0, 5));

      const clienteTotals = new Map<string, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ingresosCliente ?? []).forEach((i: any) => {
        const nombre = i.clientes?.nombre ?? i.cliente;
        clienteTotals.set(nombre, (clienteTotals.get(nombre) ?? 0) + (i.monto_cop ?? 0));
      });
      const totalClientes = Array.from(clienteTotals.values()).reduce((a, b) => a + b, 0);
      const top = Array.from(clienteTotals.entries()).sort((a, b) => b[1] - a[1])[0];
      setTopCliente(top && totalClientes > 0 ? { nombre: top[0], pct: top[1] / totalClientes } : null);

      const totals = new Map<string, number>();
      [...(variables ?? []), ...(fijos ?? [])].forEach((row) => {
        const key = row.categoria || "Sin categoría";
        totals.set(key, (totals.get(key) ?? 0) + (row.monto_cop ?? 0));
      });
      setGastosPorCategoria(
        Array.from(totals.entries())
          .map(([categoria, monto_cop]) => ({ categoria, monto_cop }))
          .sort((a, b) => b.monto_cop - a.monto_cop)
      );

      setLoading(false);
    }
    load();
  }, []);

  const mesIndex = useMemo(() => historico.findIndex((h) => h.mes === mesActivo), [historico, mesActivo]);
  const mesKpis = mesIndex >= 0 ? historico[mesIndex] : undefined;
  const mesAnterior = mesIndex > 0 ? historico[mesIndex - 1] : undefined;

  function delta(actual?: number, anterior?: number) {
    if (actual === undefined || anterior === undefined || anterior === 0) return undefined;
    return (actual - anterior) / Math.abs(anterior);
  }

  const proyeccionCaja = ingresosPendientes - gastosFijosTotal;
  const semaforoNivel = calcularSemaforo(mesKpis?.margen_pct ?? 0, metaMargen);
  const runwayMeses = gastosFijosTotal > 0 ? cajaTotalCop / gastosFijosTotal : null;

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

  const totalGastosCategoria = useMemo(
    () => gastosPorCategoria.reduce((sum, g) => sum + g.monto_cop, 0),
    [gastosPorCategoria]
  );

  if (loading) return <p className="text-muted">Cargando dashboard...</p>;

  // Tenant recién creado, todavía sin nada configurado — mostrar 10
  // tarjetas en cero no ayuda a nadie a arrancar. `mes_activo` vacío es la
  // señal más confiable: sin eso, casi todo lo demás de esta página
  // tampoco tiene con qué calcularse.
  if (!mesActivo && historico.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-lg">
        <PageHeader title="Bienvenido a tu dashboard" subtitle="Todavía no hay nada configurado — empecemos." />
        <div className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm text-muted">
            Para ver tus números aquí, primero necesitas:
          </p>
          <ol className="text-sm flex flex-col gap-2 list-decimal list-inside">
            <li>
              Ir a <a href="/configuracion" className="text-accent-bright hover:underline">Configuración</a> y definir el mes activo y tus metas de ingresos/margen.
            </li>
            <li>
              Registrar tus cuentas en <a href="/cuentas" className="text-accent-bright hover:underline">Cuentas / Caja</a>.
            </li>
            <li>
              Empezar a cargar <a href="/finanzas/ingresos" className="text-accent-bright hover:underline">Ingresos</a> y <a href="/finanzas/gastos-fijos" className="text-accent-bright hover:underline">Gastos</a>.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Dashboard financiero" subtitle={`Mes activo: ${formatMonth(mesActivo)}`} />
        <Semaforo nivel={semaforoNivel} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="TRM del día" count={trm} formatCount={(n) => n.toLocaleString("es-CO")} value="-" hint="COP/USD" />
        <KpiCard
          label="Ingresos del mes"
          count={mesKpis?.ingresos_cop ?? 0}
          formatCount={formatCOP}
          value={formatCOP(mesKpis?.ingresos_cop ?? 0)}
          delta={
            delta(mesKpis?.ingresos_cop, mesAnterior?.ingresos_cop) !== undefined
              ? { pct: delta(mesKpis?.ingresos_cop, mesAnterior?.ingresos_cop)! }
              : undefined
          }
        />
        <KpiCard
          label="Gastos del mes"
          count={mesKpis?.gastos_cop ?? 0}
          formatCount={formatCOP}
          value={formatCOP(mesKpis?.gastos_cop ?? 0)}
          delta={
            delta(mesKpis?.gastos_cop, mesAnterior?.gastos_cop) !== undefined
              ? { pct: delta(mesKpis?.gastos_cop, mesAnterior?.gastos_cop)!, invertColor: true }
              : undefined
          }
        />
        <KpiCard
          label="Utilidad neta"
          count={mesKpis?.utilidad_neta_cop ?? 0}
          formatCount={formatCOP}
          value={formatCOP(mesKpis?.utilidad_neta_cop ?? 0)}
          delta={
            delta(mesKpis?.utilidad_neta_cop, mesAnterior?.utilidad_neta_cop) !== undefined
              ? { pct: delta(mesKpis?.utilidad_neta_cop, mesAnterior?.utilidad_neta_cop)! }
              : undefined
          }
        />
        <KpiCard
          label="Margen"
          count={mesKpis?.margen_pct ?? 0}
          formatCount={formatPercent}
          value={formatPercent(mesKpis?.margen_pct ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Reveal className="glass glass-hover rounded-2xl p-4 flex flex-col gap-4 justify-center">
          <p className="text-sm font-medium">Metas del mes activo</p>
          <ProgressBar label="Ingresos" value={mesKpis?.ingresos_cop ?? 0} target={metaIngresos} formatValue={formatCOP} />
          <ProgressBar
            label="Margen"
            value={(mesKpis?.margen_pct ?? 0) * 100}
            target={metaMargen * 100}
            formatValue={(n) => `${n.toFixed(1)}%`}
          />
          {metaIngresos === 0 && metaMargen === 0 && (
            <p className="text-xs text-muted">
              Define tus metas en Configuración para ver el avance del mes.
            </p>
          )}
        </Reveal>

        <Reveal className="glass glass-hover rounded-2xl p-4 flex flex-col gap-2 justify-center" indice={1}>
          <p className="text-sm font-medium mb-1">Proyección de caja</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Por cobrar (pendiente)</span>
            <span className="font-medium">{formatCOP(ingresosPendientes)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Gastos fijos recurrentes</span>
            <span className="font-medium">{formatCOP(gastosFijosTotal)}</span>
          </div>
          <hr className="border-border my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-muted">Proyección neta</span>
            <span className={`font-bold ${proyeccionCaja >= 0 ? "text-accent-bright" : "text-danger"}`}>
              {formatCOP(proyeccionCaja)}
            </span>
          </div>
        </Reveal>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Salud del negocio</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {["COP", "USD", "EUR"].map((moneda, i) => (
            <KpiCard
              key={moneda}
              label={`Caja en ${moneda}`}
              count={cajaPorMoneda[moneda] ?? 0}
              formatCount={FORMATTERS_MONEDA[moneda]}
              value={FORMATTERS_MONEDA[moneda](cajaPorMoneda[moneda] ?? 0)}
              hint={moneda === "COP" ? "Lo que puedes gastar hoy sin vender divisas" : undefined}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="Caja total (COP)"
            count={cajaTotalCop}
            formatCount={formatCOP}
            value={formatCOP(cajaTotalCop)}
            hint={
              runwayMeses !== null
                ? `Runway: ${runwayMeses.toFixed(1)} meses de gastos fijos`
                : "Registra tus cuentas en Cuentas / Caja"
            }
          />
          <KpiCard
            label="Concentración de cliente"
            count={topCliente ? topCliente.pct : undefined}
            formatCount={formatPercent}
            value={topCliente ? formatPercent(topCliente.pct) : "-"}
            hint={topCliente ? `${topCliente.nombre} de tus ingresos vinculados` : "Vincula ingresos a clientes"}
          />
          <Reveal className="glass glass-hover rounded-2xl p-4 flex flex-col gap-2" indice={2}>
            <p className="text-xs uppercase tracking-wide text-muted">Cartera vencida</p>
            {carteraVencida.length === 0 ? (
              <p className="text-sm text-accent-bright">Sin cobros vencidos.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {carteraVencida.map((v) => (
                  <li key={v.id} className="flex justify-between text-xs">
                    <span className="truncate">{v.cliente}</span>
                    <span className="text-danger shrink-0 ml-2">
                      {v.dias_vencido}d · {formatCOP(v.monto_cop)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Reveal className="glass glass-hover rounded-2xl p-4">
          <p className="text-sm font-medium mb-3">Ingresos vs. Gastos por mes</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="mes" stroke={chartColors.axis} fontSize={12} />
              <YAxis stroke={chartColors.axis} fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                formatter={(value) => formatCOP(Number(value))}
              />
              <Bar dataKey="Ingresos" fill="#3c5e99" radius={[4, 4, 0, 0]} animationDuration={1400} animationEasing="ease-out" />
              <Bar dataKey="Gastos" fill="#d9534f" radius={[4, 4, 0, 0]} animationDuration={1400} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </Reveal>

        <Reveal className="glass glass-hover pulso-vivo rounded-2xl p-4" indice={1}>
          <p className="text-sm font-medium mb-3">Utilidad neta histórica</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="mes" stroke={chartColors.axis} fontSize={12} />
              <YAxis stroke={chartColors.axis} fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                formatter={(value) => formatCOP(Number(value))}
              />
              <Line
                type="monotone"
                dataKey="Utilidad"
                stroke="#3c5e99"
                strokeWidth={2}
                dot={false}
                animationDuration={1600}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </Reveal>

        <Reveal className="glass glass-hover rounded-2xl p-4 lg:col-span-2" indice={2}>
          <p className="text-sm font-medium mb-3">Gastos del mes activo por categoría</p>
          {gastosPorCategoria.length === 0 ? (
            <p className="text-sm text-muted">No hay gastos registrados para este mes.</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={260} className="md:max-w-[260px]">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="monto_cop"
                    nameKey="categoria"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke={chartColors.tooltipBg}
                    strokeWidth={2}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  >
                    {gastosPorCategoria.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
                    formatter={(value) => formatCOP(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>

              <ul className="flex-1 w-full flex flex-col gap-2">
                {gastosPorCategoria.map((g, i) => (
                  <li key={g.categoria} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="flex-1 truncate">{g.categoria}</span>
                    <span className="text-muted tabular-nums">
                      {totalGastosCategoria > 0
                        ? formatPercent(g.monto_cop / totalGastosCategoria)
                        : "-"}
                    </span>
                    <span className="font-medium tabular-nums w-28 text-right">
                      {formatCOP(g.monto_cop)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}
