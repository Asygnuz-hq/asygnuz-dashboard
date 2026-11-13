"use client";

// Negocio por mensualidad (Growth: pauta, contenido, community, mentoría) — 2026-11-13.

import { useDeferredValue, useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { formatCOP, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import {
  PLANTILLA_MENSUALIDAD, REGLA_MENSUALIDAD,
  costoMes, curvaFees, desgloseMes, feesSugeridos, resumenMensualidad, simularMensualidad,
  type SupuestosMensualidad,
} from "@/lib/casos/mensualidad";
import { BTN, Num, RangoInput, TablaFilas, millones, type Cambiar, type Caso } from "./ui";
import { ValorCliente } from "./ValorCliente";

const cop = (x: number) => formatCOP(Math.round(x / 1000) * 1000);

export function CasoMensualidad({ caso: crudo, cambiar }: { caso: Caso<SupuestosMensualidad>; cambiar: Cambiar<SupuestosMensualidad> }) {
  const theme = useTheme();
  const colores = CHART_COLORS[theme];
  const caso = useMemo(() => ({ ...crudo, supuestos: { ...PLANTILLA_MENSUALIDAD, ...crudo.supuestos } }), [crudo]);
  const sup = (f: (s: SupuestosMensualidad) => void) => cambiar((c) => f(c.supuestos));

  const supuestos = useDeferredValue(caso.supuestos);
  const sim = useMemo(() => simularMensualidad(supuestos), [supuestos]);
  const fees = useMemo(() => feesSugeridos(sim), [sim]);
  const fee = caso.precio || fees.recomendado;
  const r = useMemo(() => resumenMensualidad(sim, fee), [sim, fee]);
  const curva = useMemo(() => curvaFees(sim, fees.piso * 0.6, fees.premium * 1.3), [sim, fees]);
  const partes = useMemo(() => desgloseMes(supuestos), [supuestos]);

  const s = caso.supuestos;
  const costoTotal = partes.reduce((a, p) => a + p.valor, 0);
  const horasTotales = s.equipo.reduce((a, e) => a + e.horasMes, 0);
  const tipico = costoMes(s, s.alcanceExtra.moda, s.trm.moda).total;

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg">Cuánto cobrar al mes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Fee recomendado"
            value={cop(fees.recomendado)}
            hint={`Gana plata con ${formatPercent(REGLA_MENSUALIDAD.recVpnPos)} de los clientes y llega a la meta con el ${formatPercent(REGLA_MENSUALIDAD.recRoiMeta)}`}
          />
          <KpiCard label="Piso (no bajar de aquí)" value={cop(fees.piso)} hint={`Gana plata con el ${formatPercent(REGLA_MENSUALIDAD.pisoVpnPos)} de los clientes`} />
          <KpiCard label="Premium" value={cop(fees.premium)} hint={`Llega a la meta con el ${formatPercent(REGLA_MENSUALIDAD.premiumRoiMeta)} de los clientes`} />
          <KpiCard label="Costo de un mes típico" value={cop(tipico)} hint={`${horasTotales} h al mes del equipo, con horas de más y administración`} />
        </div>
      </section>

      <section className="glass rounded-2xl border p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Fee mensual a cobrar (COP, sin IVA)
            <Num value={fee} onChange={(v) => cambiar((c) => void (c.precio = v))} className="w-40" />
          </label>
          <button className={BTN} onClick={() => cambiar((c) => void (c.precio = fees.recomendado))}>Usar el recomendado</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Margen de un mes" value={formatPercent(r.margenMes)} hint={`Gana ${cop(fee * (1 - s.pctSobrePrecio) - r.costoMesMedia)} al mes por cliente`} />
          <KpiCard label="Prob. de ganar plata" value={formatPercent(r.pVpnPos)} hint={`Meta de ROI ${formatPercent(s.metaRoi)}: ${formatPercent(r.pRoiMeta)}`} />
          <KpiCard label="Se queda en promedio" value={`${r.mesesMedia.toFixed(1).replace(".", ",")} meses`} hint={`Cumple el mínimo de ${s.mesesMinimo}: ${formatPercent(r.pMinimo)}`} />
          <KpiCard
            label="Recupera el montaje"
            value={r.recuperaMontaje === null ? "No recupera" : r.recuperaMontaje === 0 ? "De entrada" : `Mes ${r.recuperaMontaje}`}
            hint={r.recuperaMontaje ? `El cliente llega a ese mes en el ${formatPercent(r.pRecupera)} de los casos` : "El cobro de montaje lo cubre"}
          />
        </div>
        <p className="text-xs text-muted">
          Ingreso esperado por cliente: {millones(r.ingresoMedia)} en {s.horizonte} meses como máximo. Si sale mal (1 de cada 20), el VPN es {millones(r.vpnP5)}.
          {r.pRecupera < 0.8 && r.recuperaMontaje ? " Cobra el montaje o sube el mínimo de meses: muchos clientes se irían antes de pagarlo." : ""}
        </p>
      </section>

      <section className="glass rounded-2xl border p-4">
        <h2 className="font-display text-lg mb-1">Probabilidad según el fee</h2>
        <p className="text-xs text-muted mb-3">De 100 clientes iguales, con cuántos ganamos plata y con cuántos llegamos a la meta de margen.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curva}>
            <CartesianGrid strokeDasharray="3 3" stroke={colores.grid} />
            <XAxis dataKey="precio" stroke={colores.axis} fontSize={12} tickFormatter={(x) => `${(x / 1e6).toFixed(1)} M`} />
            <YAxis stroke={colores.axis} fontSize={12} domain={[0, 1]} tickFormatter={(x) => `${Math.round(x * 100)} %`} />
            <Tooltip
              contentStyle={{ background: colores.tooltipBg, border: `1px solid ${colores.tooltipBorder}`, color: colores.tooltipText }}
              labelFormatter={(x) => formatCOP(Number(x))}
              formatter={(v) => formatPercent(Number(v))}
            />
            <Legend />
            <ReferenceLine x={curva.reduce((a, p) => (Math.abs(p.precio - fee) < Math.abs(a - fee) ? p.precio : a), 0)} stroke={colores.axis} strokeDasharray="4 4" label={{ value: "Tu fee", fontSize: 11, fill: colores.axis }} />
            <Line type="monotone" dataKey="pVpnPos" name="Ganar plata (VPN > 0)" stroke="#5c8a72" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="pRoiMeta" name={`Margen ≥ meta (ROI ${formatPercent(s.metaRoi)})`} stroke="#4f7cc4" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="glass rounded-2xl border p-4">
        <h2 className="font-display text-lg mb-1">En qué se va la plata cada mes</h2>
        <p className="text-xs text-muted mb-3">Mes típico: horas de más y TRM en su valor más probable. El montaje va aparte.</p>
        {partes.map((p) => (
          <div key={p.concepto} className="mb-2">
            <div className="flex justify-between text-sm"><span>{p.concepto}</span><span>{cop(p.valor)} · {formatPercent(p.valor / costoTotal)}</span></div>
            <div className="h-1.5 rounded bg-surface-alt"><div className="h-1.5 rounded bg-accent" style={{ width: `${(p.valor / costoTotal) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="glass rounded-2xl border p-4 flex flex-col gap-4 overflow-x-auto">
        <h2 className="font-display text-lg">Supuestos</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">Negocio<input value={caso.nombre} onChange={(e) => cambiar((c) => void (c.nombre = e.target.value))} /></label>
          <label className="flex flex-col gap-1 text-sm">Cliente<input value={caso.cliente ?? ""} onChange={(e) => cambiar((c) => void (c.cliente = e.target.value || null))} /></label>
        </div>

        <TablaFilas
          titulo="Equipo (horas al mes dedicadas a este cliente)"
          columnas={["Rol", "Pago mensual (COP)", "Horas al mes", "Costo al mes"]}
          filas={s.equipo}
          nueva={{ nombre: "", pagoMensual: 0, horasMes: 10 }}
          onChange={(f) => sup((x) => void (x.equipo = f))}
          celdas={(e, set) => [
            <input key="n" value={e.nombre} onChange={(ev) => set({ ...e, nombre: ev.target.value })} />,
            <Num key="p" value={e.pagoMensual} onChange={(v) => set({ ...e, pagoMensual: v })} className="w-36" />,
            <Num key="h" value={e.horasMes} onChange={(v) => set({ ...e, horasMes: v })} className="w-20" />,
            <span key="c" className="text-muted">{cop((e.pagoMensual / (s.horasMesCompleto || 176)) * e.horasMes)}</span>,
          ]}
        />

        <TablaFilas
          titulo="Herramientas (USD al mes, se convierten con la TRM)"
          columnas={["Herramienta", "USD al mes", "Cantidad"]}
          filas={s.herramientas}
          nueva={{ nombre: "", usdMes: 0, cantidad: 1 }}
          onChange={(f) => sup((x) => void (x.herramientas = f))}
          celdas={(h, set) => [
            <input key="n" value={h.nombre} onChange={(e) => set({ ...h, nombre: e.target.value })} />,
            <Num key="u" value={h.usdMes} onChange={(v) => set({ ...h, usdMes: v })} />,
            <Num key="c" value={h.cantidad} onChange={(v) => set({ ...h, cantidad: v })} />,
          ]}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">Horas de un mes completo<Num value={s.horasMesCompleto} onChange={(v) => sup((x) => void (x.horasMesCompleto = v || 176))} /></label>
          <label className="flex flex-col gap-1">Otros costos al mes (COP)<Num value={s.otrosMes} onChange={(v) => sup((x) => void (x.otrosMes = v))} className="w-36" /></label>
          <label className="flex flex-col gap-1">Cobro de montaje (COP)<Num value={s.montaje.cobro} onChange={(v) => sup((x) => void (x.montaje.cobro = v))} className="w-36" /></label>
          <label className="flex flex-col gap-1">Costo de montaje (COP)<Num value={s.montaje.costo} onChange={(v) => sup((x) => void (x.montaje.costo = v))} className="w-36" /></label>
          <label className="flex flex-col gap-1">Meses mínimos de contrato<Num value={s.mesesMinimo} onChange={(v) => sup((x) => void (x.mesesMinimo = Math.max(1, Math.round(v))))} /></label>
          <label className="flex flex-col gap-1">Meses a evaluar<Num value={s.horizonte} onChange={(v) => sup((x) => void (x.horizonte = Math.min(60, Math.max(1, Math.round(v)))))} /></label>
          <label className="flex flex-col gap-1">Prob. de irse cada mes durante el mínimo (%)<Num pct value={s.churnMinimo} onChange={(v) => sup((x) => void (x.churnMinimo = v))} /></label>
          <label className="flex flex-col gap-1">
            Cobro
            <select value={s.cobroAnticipado ? "si" : "no"} onChange={(e) => sup((x) => void (x.cobroAnticipado = e.target.value === "si"))}>
              <option value="si">Mes anticipado</option>
              <option value="no">Mes vencido</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">Tasa de descuento (EA, %)<Num pct value={s.tasaDescuentoEA} onChange={(v) => sup((x) => void (x.tasaDescuentoEA = v))} /></label>
          <label className="flex flex-col gap-1">Meta de ROI sobre el costo (%)<Num pct value={s.metaRoi} onChange={(v) => sup((x) => void (x.metaRoi = v))} /></label>
          <label className="flex flex-col gap-1">Administración sobre el costo (%)<Num pct value={s.administracion} onChange={(v) => sup((x) => void (x.administracion = v))} /></label>
          <label className="flex flex-col gap-1">Comisión + ICA + 4x1000 (% del fee)<Num pct value={s.pctSobrePrecio} onChange={(v) => sup((x) => void (x.pctSobrePrecio = v))} /></label>
        </div>

        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Prob. de irse cada mes después del mínimo (mín / prob / máx, %)
            <RangoInput pct value={s.churn} onChange={(v) => sup((x) => void (x.churn = v))} className="w-20" />
          </label>
          <label className="flex flex-col gap-1">
            Horas de más sobre lo acordado (mín / prob / máx, %)
            <RangoInput pct value={s.alcanceExtra} onChange={(v) => sup((x) => void (x.alcanceExtra = v))} className="w-20" />
          </label>
          <label className="flex flex-col gap-1">
            TRM (mín / prob / máx)
            <RangoInput value={s.trm} onChange={(v) => sup((x) => void (x.trm = v))} className="w-20" />
          </label>
        </div>
        <p className="text-xs text-muted">
          Cada simulación saca una tasa de salida, unas horas de más y una TRM (PERT). Al final de cada mes el cliente decide si sigue: durante el mínimo
          con la probabilidad de incumplir y después con la tasa de salida. Un 8 % al mes equivale a que el cliente se quede, en promedio, un año.
        </p>
      </section>

      <ValorCliente
        valor={s.valor}
        mesInicioSugerido={1}
        precio={fee}
        unidad="fee"
        nuestroMinimo={fees.recomendado}
        pago={{ tipo: "mensualidad", montaje: s.montaje.cobro }}
        onChange={(v) => sup((x) => void (x.valor = v))}
      />
    </>
  );
}
