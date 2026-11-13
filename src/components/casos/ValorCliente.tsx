"use client";

// Valor para el cliente (lógica del caso EmpoderaDos F3): cuánto gana el cliente con lo que le vendemos,
// el techo de precio y el argumento para la propuesta. Va al final de cada negocio.

import { useDeferredValue, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { formatCOP, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { PLANTILLA_VALOR, flujoValor, inversionMensualidad, inversionProyecto, resumenValor, simularValor, type Valor } from "@/lib/casos/valor";
import { BTN, Num, RangoInput, TablaFilas, millones } from "./ui";

/** Cómo paga el cliente: proyecto (anticipo al firmar, resto en `mesPago`) o mensualidad (fee cada mes + montaje). */
export type Pago = { tipo: "proyecto"; anticipo: number; mesPago: number } | { tipo: "mensualidad"; montaje: number };

export function ValorCliente({
  valor, mesInicioSugerido, precio, unidad, nuestroMinimo, pago, onChange,
}: {
  valor: Valor | undefined;
  mesInicioSugerido: number;
  precio: number;
  unidad: "precio" | "fee";
  nuestroMinimo: number; // nuestro precio recomendado: por debajo perdemos nosotros
  pago: Pago;
  onChange: (v: Valor | undefined) => void;
}) {
  const theme = useTheme();
  const colores = CHART_COLORS[theme];
  const [copiado, setCopiado] = useState(false);
  const v = useDeferredValue(valor);
  const esProyecto = pago.tipo === "proyecto";
  const a = pago.tipo === "proyecto" ? pago.anticipo : pago.montaje;
  const b = pago.tipo === "proyecto" ? pago.mesPago : 0;
  const inv = useMemo(() => (v ? (esProyecto ? inversionProyecto(v, a, b) : inversionMensualidad(v, a)) : null), [v, esProyecto, a, b]);
  const sim = useMemo(() => (v && inv ? simularValor(v, inv) : null), [v, inv]);
  const r = useMemo(() => (sim ? resumenValor(sim, precio) : null), [sim, precio]);
  const flujo = useMemo(() => (sim ? flujoValor(sim, precio) : []), [sim, precio]);

  const que = unidad === "fee" ? "fee mensual" : "precio";
  const fmt = (x: number) => (unidad === "fee" ? formatCOP(Math.round(x / 10_000) * 10_000) : millones(x));

  if (!valor) {
    return (
      <section className="glass rounded-2xl border p-4 flex flex-col gap-2">
        <h2 className="font-display text-lg">Valor para el cliente</h2>
        <p className="text-sm text-muted">
          Lo de arriba dice cuánto debemos cobrar para no perder. Esto dice cuánto gana el cliente con lo que le vendemos (horas que libera,
          ahorros, ventas extra) y hasta dónde puede pagar: el techo del precio y el argumento para la propuesta.
        </p>
        <div>
          <button className={BTN} onClick={() => onChange({ ...structuredClone(PLANTILLA_VALOR), inicioMes: mesInicioSugerido })}>
            Calcular el valor para el cliente
          </button>
        </div>
      </section>
    );
  }

  const set = (f: (x: Valor) => void) => {
    const n = structuredClone(valor);
    f(n);
    onChange(n);
  };

  const argumento = r
    ? `Con esta solución esperamos que ${unidad === "fee" ? "tu negocio" : "tu equipo"} gane del orden de ${millones(r.beneficioPleno)} al mes cuando esté en marcha ` +
      `(${millones(r.beneficioTotalMedia)} en ${valor.horizonte} meses). La inversión es de ${unidad === "fee" ? `${formatCOP(precio)} al mes` : formatCOP(precio)}` +
      `${r.recuperaMes !== null ? ` y se recupera hacia el mes ${r.recuperaMes}` : ""}: por cada peso invertido, el retorno esperado es de ${r.multiplo.toFixed(1).replace(".", ",")} pesos.`
    : "";

  return (
    <section className="glass rounded-2xl border p-4 flex flex-col gap-4 overflow-x-auto">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg">Valor para el cliente</h2>
          <p className="text-xs text-muted">Desde el lado del cliente: lo que gana contra lo que nos paga, en {valor.horizonte} meses. 10.000 simulaciones.</p>
        </div>
        <button className="text-xs text-danger" onClick={() => onChange(undefined)}>Quitar este análisis</button>
      </div>

      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Beneficio del cliente" value={millones(r.beneficioTotalMedia)} hint={`En ${valor.horizonte} meses; ${millones(r.beneficioPleno)}/mes en régimen`} />
            <KpiCard
              label="Rinde por cada peso"
              value={`${r.multiplo.toFixed(1).replace(".", ",")}×`}
              hint={`VPN del cliente ${millones(r.vpnMedia)}; pierde en el ${formatPercent(r.pPierde)} de los casos`}
            />
            <KpiCard label="Recupera su inversión" value={r.recuperaMes === null ? "No recupera" : `Mes ${r.recuperaMes}`} hint="Escenario esperado, contando desde la firma" />
            <KpiCard label={`Techo de ${que}`} value={fmt(r.techo)} hint="Hasta aquí el cliente todavía gana en 8 de 10 escenarios" />
          </div>

          <div className="rounded-xl border border-border p-3 text-sm flex flex-col gap-1">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>Nuestro mínimo (recomendado): <b>{fmt(nuestroMinimo)}</b></span>
              <span>Precio por valor (le devuelve 3×): <b>{fmt(r.precio3x)}</b></span>
              <span>Techo: <b>{fmt(r.techo)}</b></span>
              <span>Tu {que}: <b>{fmt(precio)}</b></span>
            </div>
            {r.techo < nuestroMinimo ? (
              <p className="text-danger">
                El techo del cliente está por debajo de nuestro mínimo: a ese precio uno de los dos pierde. Reduce el alcance, sube el beneficio con
                datos reales o no tomes el negocio.
              </p>
            ) : precio < r.precio3x && r.precio3x > nuestroMinimo ? (
              <p className="text-muted">Hay espacio para subir: el cliente gana más de 3 veces lo que paga. Cotiza más cerca de {fmt(r.precio3x)}.</p>
            ) : precio > r.techo ? (
              <p className="text-danger">Estás por encima del techo: el cliente tiene altas probabilidades de no recuperar lo que paga.</p>
            ) : (
              <p className="text-muted">El precio está en el rango sano: cubre nuestro costo y el cliente gana con holgura.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Beneficio acumulado contra lo que paga el cliente</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={flujo}>
                <CartesianGrid strokeDasharray="3 3" stroke={colores.grid} />
                <XAxis dataKey="mes" stroke={colores.axis} fontSize={12} tickFormatter={(m) => `M${m}`} />
                <YAxis stroke={colores.axis} fontSize={12} tickFormatter={(x) => `${Math.round(x / 1e6)} M`} />
                <Tooltip
                  contentStyle={{ background: colores.tooltipBg, border: `1px solid ${colores.tooltipBorder}`, color: colores.tooltipText }}
                  labelFormatter={(m) => `Mes ${m}`}
                  formatter={(x) => formatCOP(Number(x))}
                />
                <Legend />
                <Line type="monotone" dataKey="beneficio" name="Beneficio acumulado" stroke="#5c8a72" dot={false} strokeWidth={2} />
                <Line type="stepAfter" dataKey="pagado" name="Pagado acumulado" stroke="#c46a4f" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border p-3 text-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Argumento para la propuesta</h3>
              <button
                className={BTN}
                onClick={() => {
                  navigator.clipboard?.writeText(argumento).then(() => setCopiado(true), () => {});
                  setTimeout(() => setCopiado(false), 1500);
                }}
              >
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p>{argumento}</p>
          </div>
        </>
      )}

      <TablaFilas
        titulo="Beneficios del cliente (COP al mes cuando ya está en marcha)"
        columnas={["Beneficio", "Mínimo / probable / máximo", "Prob. de lograrlo %", "Cómo se calcula"]}
        filas={valor.beneficios}
        nueva={{ nombre: "", mensual: { min: 0, moda: 0, max: 0 }, prob: 0.8, nota: "" }}
        onChange={(f) => set((x) => void (x.beneficios = f))}
        celdas={(b, setB) => [
          <input key="n" value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} />,
          <RangoInput key="r" value={b.mensual} onChange={(m) => setB({ ...b, mensual: m })} className="w-28" />,
          <Num key="p" pct value={b.prob} onChange={(p) => setB({ ...b, prob: p })} className="w-20" />,
          <input key="t" className="w-64" value={b.nota} placeholder="Ej.: 120 h × 25.000" onChange={(e) => setB({ ...b, nota: e.target.value })} />,
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <label className="flex flex-col gap-1">Empieza a dar beneficio en el mes<Num value={valor.inicioMes} onChange={(x) => set((v) => void (v.inicioMes = Math.max(1, Math.round(x))))} /></label>
        <label className="flex flex-col gap-1">
          Meses hasta el beneficio pleno (mín / prob / máx)
          <RangoInput value={valor.rampa} onChange={(x) => set((v) => void (v.rampa = x))} className="w-20" />
        </label>
        <label className="flex flex-col gap-1">Meses a evaluar<Num value={valor.horizonte} onChange={(x) => set((v) => void (v.horizonte = Math.min(60, Math.max(1, Math.round(x)))))} /></label>
        <label className="flex flex-col gap-1">Costo del cliente al inicio (COP)<Num value={valor.costoClienteInicial} onChange={(x) => set((v) => void (v.costoClienteInicial = x))} className="w-36" /></label>
        <label className="flex flex-col gap-1">Costo del cliente al mes (COP)<Num value={valor.costoClienteMes} onChange={(x) => set((v) => void (v.costoClienteMes = x))} className="w-36" /></label>
        <label className="flex flex-col gap-1">Tasa de descuento del cliente (EA, %)<Num pct value={valor.tasaDescuentoEA} onChange={(x) => set((v) => void (v.tasaDescuentoEA = x))} /></label>
      </div>
      <p className="text-xs text-muted">
        Cada beneficio ocurre o no según su probabilidad y su monto varía entre mínimo y máximo (PERT). Pon el margen de las ventas, no la venta, y el costo
        empresa de las horas liberadas. Costos del cliente: licencias o tiempo de su equipo que no nos paga a nosotros.
      </p>
    </section>
  );
}
