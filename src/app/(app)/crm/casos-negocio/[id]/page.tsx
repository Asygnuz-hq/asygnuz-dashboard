"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCOP, formatPercent } from "@/lib/format";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import {
  ESCENARIOS, MOMENTOS, PLANTILLA, REGLA,
  curvaPrecios, desglose, indicadores, preciosSugeridos, resumen, sensibilidad, simular,
  type Escenario, type Momento, type Rango, type Supuestos, type Vista,
} from "@/lib/casos/modelo";
import { ETAPA, ETAPAS, type EtapaId } from "@/lib/casos/etapas";

type Caso = {
  nombre: string; cliente: string | null; precio: number; supuestos: Supuestos;
  etapa: EtapaId; prob_cierre: number | null; fecha_cierre: string | null; responsable: string | null;
  proyecto_kaneo: string | null; notas: string | null; motivo_perdida: string | null;
};

const BTN = "text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt disabled:opacity-50";
const BTN_PRIMARIO = "text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50";
const TH = "px-2 py-2 text-left text-xs uppercase tracking-wide text-muted border-b border-border";
const TD = "px-2 py-1.5 border-b border-border";
const NOMBRE: Record<Vista, string> = { pesimista: "Pesimista", probable: "Probable", optimista: "Optimista", ponderado: "Ponderado" };
const millones = (x: number) => `${(x / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;

// Input numérico; con `pct` muestra 40 y guarda 0,4.
function Num({ value, onChange, pct, className = "w-28" }: { value: number; onChange: (v: number) => void; pct?: boolean; className?: string }) {
  return (
    <input
      type="number"
      step="any"
      className={`${className} text-right`}
      value={pct ? Math.round(value * 10000) / 100 : value}
      onChange={(e) => onChange((Number(e.target.value) || 0) / (pct ? 100 : 1))}
    />
  );
}

export default function CasoNegocioPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const colores = CHART_COLORS[theme];
  const [caso, setCaso] = useState<Caso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"guardado" | "cambios" | "guardando">("guardado");
  const [etapaGuardada, setEtapaGuardada] = useState<EtapaId | null>(null);

  useEffect(() => {
    createClient()
      .from("casos_negocio")
      .select("nombre, cliente, precio, supuestos, etapa, prob_cierre, fecha_cierre, responsable, proyecto_kaneo, notas, motivo_perdida")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setCaso({
          ...data,
          precio: Number(data.precio),
          prob_cierre: data.prob_cierre === null ? null : Number(data.prob_cierre),
          supuestos: { ...PLANTILLA, ...data.supuestos },
        });
        setEtapaGuardada(data.etapa);
      });
  }, [id]);

  function cambiar(f: (c: Caso) => void) {
    setCaso((c) => {
      if (!c) return c;
      const n = structuredClone(c);
      f(n);
      return n;
    });
    setEstado("cambios");
  }
  const sup = (f: (s: Supuestos) => void) => cambiar((c) => f(c.supuestos));

  async function guardar() {
    if (!caso) return;
    setEstado("guardando");
    const ahora = new Date().toISOString();
    const { error } = await createClient()
      .from("casos_negocio")
      .update({ ...caso, actualizado_en: ahora, ...(caso.etapa !== etapaGuardada ? { etapa_desde: ahora } : {}) })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return setEstado("cambios");
    }
    setEtapaGuardada(caso.etapa);
    setEstado("guardado");
  }

  // La simulación corre en el navegador (~0,3 s); el valor diferido evita que bloquee al escribir.
  const supuestos = useDeferredValue(caso?.supuestos);
  const sim = useMemo(() => (supuestos ? simular(supuestos) : null), [supuestos]);
  const precios = useMemo(() => (sim ? preciosSugeridos(sim) : null), [sim]);
  const precio = caso?.precio || precios?.recomendado || 0;
  const vistas = useMemo(
    () => (sim ? (["pesimista", "probable", "optimista", "ponderado"] as Vista[]).map((v) => ({ v, r: resumen(sim, v, precio) })) : []),
    [sim, precio],
  );
  const curva = useMemo(() => (sim && precios ? curvaPrecios(sim, precios.piso * 0.6, precios.premium * 1.2) : []), [sim, precios]);
  const partes = useMemo(() => (sim ? desglose(sim) : []), [sim]);
  const drivers = useMemo(() => (sim ? sensibilidad(sim) : []), [sim]);

  if (error && !caso) return <p className="text-sm text-danger">No se pudo abrir el caso: {error}</p>;
  if (!caso || !sim || !precios || !supuestos) return <p className="text-sm text-muted">Calculando…</p>;

  const s = caso.supuestos;
  const costoTotal = partes.reduce((a, p) => a + p.valor, 0);
  const pond = vistas.find((x) => x.v === "ponderado")!.r;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={caso.nombre} subtitle={caso.cliente ? `Cliente: ${caso.cliente}` : "Caso de negocio"} />
        <div className="flex items-center gap-2">
          <Link href="/crm/casos-negocio" className={BTN}>Volver a negocios</Link>
          <button className={BTN_PRIMARIO} disabled={estado !== "cambios"} onClick={guardar}>
            {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="glass rounded-2xl border p-4 flex flex-col gap-3">
        <h2 className="font-display text-lg">Seguimiento</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Etapa
            <select value={caso.etapa} onChange={(e) => cambiar((c) => void (c.etapa = e.target.value as EtapaId))}>
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Prob. de cierre (%)
            <input
              type="number"
              min={0}
              max={100}
              className="w-24 text-right"
              placeholder={String(Math.round((ETAPA[caso.etapa]?.prob ?? 0) * 100))}
              value={caso.prob_cierre === null ? "" : Math.round(caso.prob_cierre * 100)}
              onChange={(e) =>
                cambiar((c) => void (c.prob_cierre = e.target.value === "" ? null : Math.min(1, Math.max(0, Number(e.target.value) / 100))))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cierre estimado
            <input type="date" value={caso.fecha_cierre ?? ""} onChange={(e) => cambiar((c) => void (c.fecha_cierre = e.target.value || null))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Responsable
            <input value={caso.responsable ?? ""} onChange={(e) => cambiar((c) => void (c.responsable = e.target.value || null))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Proyecto en Kaneo
            <input value={caso.proyecto_kaneo ?? ""} placeholder="Link o nombre" onChange={(e) => cambiar((c) => void (c.proyecto_kaneo = e.target.value || null))} />
          </label>
        </div>
        {caso.etapa === "perdido" && (
          <label className="flex flex-col gap-1 text-sm">
            Por qué se perdió
            <input value={caso.motivo_perdida ?? ""} placeholder="Precio, alcance, eligió otro proveedor…" onChange={(e) => cambiar((c) => void (c.motivo_perdida = e.target.value || null))} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Notas
          <textarea rows={2} value={caso.notas ?? ""} onChange={(e) => cambiar((c) => void (c.notas = e.target.value || null))} />
        </label>
        <p className="text-xs text-muted">Si dejas la probabilidad vacía, se usa la de la etapa. Los cambios se guardan con &quot;Guardar cambios&quot;.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg">Cuánto cobrar</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Precio recomendado" value={millones(precios.recomendado)} hint={`Gana plata en el ${formatPercent(REGLA.pondVpnPos)} de los casos y llega a la meta en el ${formatPercent(REGLA.pondRoiMeta)}`} />
          <KpiCard label="Piso (no bajar de aquí)" value={millones(precios.piso)} hint={`Gana plata en el ${formatPercent(REGLA.pisoVpnPos)}; la meta de margen no está cubierta`} />
          <KpiCard label="Premium" value={millones(precios.premium)} hint="Llega a la meta incluso si todo sale mal (pesimista)" />
          <KpiCard label="Costo esperado" value={millones(costoTotal)} hint={`Entre ${millones(pond.costoP10)} y ${millones(pond.costoP90)} (80 % de los casos)`} />
        </div>
      </section>

      <section className="glass rounded-2xl border p-4 flex flex-col gap-3 overflow-x-auto">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Precio a cobrar (COP, sin IVA)
            <Num value={precio} onChange={(v) => cambiar((c) => void (c.precio = v))} className="w-40" />
          </label>
          <button className={BTN} onClick={() => cambiar((c) => void (c.precio = precios.recomendado))}>Usar el recomendado</button>
          <p className="text-xs text-muted">Con este precio, por escenario (10.000 simulaciones cada uno):</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>Escenario</th>
              <th className={`${TH} text-right`}>Costo medio</th>
              <th className={`${TH} text-right`}>Margen típico</th>
              <th className={`${TH} text-right`}>Prob. de ganar plata</th>
              <th className={`${TH} text-right`}>Prob. de margen ≥ meta</th>
              <th className={`${TH} text-right`}>Si sale mal (VPN 5 %)</th>
              <th className={`${TH} text-right`}>Caja a financiar</th>
              <th className={`${TH} text-right`}>Semanas</th>
            </tr>
          </thead>
          <tbody>
            {vistas.map(({ v, r }) => (
              <tr key={v} className={v === "ponderado" ? "font-medium" : ""}>
                <td className={TD}>{NOMBRE[v]}{v !== "ponderado" && <span className="text-muted text-xs"> ({formatPercent(s.pesos[v])})</span>}</td>
                <td className={`${TD} text-right`}>{millones(r.costoMedia)}</td>
                <td className={`${TD} text-right ${r.margenP50 < 0 ? "text-danger" : ""}`}>{formatPercent(r.margenP50)}</td>
                <td className={`${TD} text-right ${r.pVpnPos < 0.8 ? "text-danger" : ""}`}>{formatPercent(r.pVpnPos)}</td>
                <td className={`${TD} text-right`}>{formatPercent(r.pRoiMeta)}</td>
                <td className={`${TD} text-right ${r.vpnP5 < 0 ? "text-danger" : ""}`}>{millones(r.vpnP5)}</td>
                <td className={`${TD} text-right`}>{millones(-r.exposicionP90)}</td>
                <td className={`${TD} text-right`}>{r.duracionP50}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">
          Margen = (precio − costo) / precio; la meta es un ROI de {formatPercent(s.metaRoi)} sobre el costo (margen de {formatPercent(s.metaRoi / (1 + s.metaRoi))}).
          &quot;Si sale mal&quot; es el VPN que solo empeora en 1 de cada 20 casos. &quot;Caja a financiar&quot; es lo máximo que se pone de bolsillo antes de que pague el cliente (9 de cada 10 casos).
        </p>

        <h3 className="text-sm font-semibold mt-2">Flujo base, sin azar (valores más probables y riesgos a su valor esperado)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>Escenario</th>
              <th className={`${TH} text-right`}>Costo</th>
              <th className={`${TH} text-right`}>VPN</th>
              <th className={`${TH} text-right`}>ROI</th>
              <th className={`${TH} text-right`}>TIR mensual</th>
              <th className={`${TH} text-right`}>Recupera en semana</th>
              <th className={`${TH} text-right`}>Cliente paga en semana</th>
            </tr>
          </thead>
          <tbody>
            {ESCENARIOS.map((e) => {
              const d = indicadores(supuestos, e, precio);
              return (
                <tr key={e}>
                  <td className={TD}>{NOMBRE[e]}</td>
                  <td className={`${TD} text-right`}>{formatCOP(d.costo)}</td>
                  <td className={`${TD} text-right ${d.vpn < 0 ? "text-danger" : ""}`}>{formatCOP(d.vpn)}</td>
                  <td className={`${TD} text-right`}>{formatPercent(d.roi)}</td>
                  <td className={`${TD} text-right`}>{d.tirMensual === null ? "—" : formatPercent(d.tirMensual)}</td>
                  <td className={`${TD} text-right`}>{d.payback ?? "No recupera"}</td>
                  <td className={`${TD} text-right`}>{d.semanaPago}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="glass rounded-2xl border p-4">
        <h2 className="font-display text-lg mb-1">Probabilidad según el precio</h2>
        <p className="text-xs text-muted mb-3">Vista ponderada. Cada punto: de 100 proyectos iguales, en cuántos ganamos plata y en cuántos llegamos a la meta de margen.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curva}>
            <CartesianGrid strokeDasharray="3 3" stroke={colores.grid} />
            <XAxis dataKey="precio" stroke={colores.axis} fontSize={12} tickFormatter={(x) => `${Math.round(x / 1e6)} M`} />
            <YAxis stroke={colores.axis} fontSize={12} domain={[0, 1]} tickFormatter={(x) => `${Math.round(x * 100)} %`} />
            <Tooltip
              contentStyle={{ background: colores.tooltipBg, border: `1px solid ${colores.tooltipBorder}`, color: colores.tooltipText }}
              labelFormatter={(x) => formatCOP(Number(x))}
              formatter={(v) => formatPercent(Number(v))}
            />
            <Legend />
            <ReferenceLine x={curva.reduce((a, p) => (Math.abs(p.precio - precio) < Math.abs(a - precio) ? p.precio : a), 0)} stroke={colores.axis} strokeDasharray="4 4" label={{ value: "Tu precio", fontSize: 11, fill: colores.axis }} />
            <Line type="monotone" dataKey="pVpnPos" name="Ganar plata (VPN > 0)" stroke="#5c8a72" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="pRoiMeta" name={`Margen ≥ meta (ROI ${formatPercent(s.metaRoi)})`} stroke="#4f7cc4" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="glass rounded-2xl border p-4">
          <h2 className="font-display text-lg mb-1">En qué se va la plata</h2>
          <p className="text-xs text-muted mb-3">Costo esperado por concepto (vista ponderada).</p>
          {partes.map((p) => (
            <div key={p.concepto} className="mb-2">
              <div className="flex justify-between text-sm"><span>{p.concepto}</span><span>{millones(p.valor)} · {formatPercent(p.valor / costoTotal)}</span></div>
              <div className="h-1.5 rounded bg-surface-alt"><div className="h-1.5 rounded bg-accent" style={{ width: `${(p.valor / costoTotal) * 100}%` }} /></div>
            </div>
          ))}
        </section>
        <section className="glass rounded-2xl border p-4">
          <h2 className="font-display text-lg mb-1">Qué mueve el precio</h2>
          <p className="text-xs text-muted mb-3">
            Correlación (Spearman) de cada variable con el precio de equilibrio, dentro del escenario probable. Cerca de 0 no mueve; un riesgo con probabilidad 100 % sale en 0 porque no es incierto: es un costo fijo.
          </p>
          {drivers.map((d) => (
            <div key={d.variable} className="flex justify-between text-sm border-b border-border py-1">
              <span>{d.variable}</span>
              <span className={Math.abs(d.rho) >= 0.3 ? "font-medium" : "text-muted"}>{d.rho.toFixed(2)}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="glass rounded-2xl border p-4 flex flex-col gap-4 overflow-x-auto">
        <h2 className="font-display text-lg">Supuestos</h2>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">Proyecto<input value={caso.nombre} onChange={(e) => cambiar((c) => void (c.nombre = e.target.value))} /></label>
          <label className="flex flex-col gap-1 text-sm">Cliente<input value={caso.cliente ?? ""} onChange={(e) => cambiar((c) => void (c.cliente = e.target.value || null))} /></label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {(
            [
              ["tasaDescuentoEA", "Tasa de descuento (EA, %)"],
              ["metaRoi", "Meta de ROI sobre el costo (%)"],
              ["administracion", "Administración sobre el costo (%)"],
              ["pctSobrePrecio", "Comisión + ICA + 4x1000 (% del precio)"],
              ["anticipo", "Anticipo al firmar (% del precio)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1">{label}<Num pct value={s[k]} onChange={(v) => sup((x) => void (x[k] = v))} /></label>
          ))}
          <label className="flex flex-col gap-1">Semanas por mes (el Excel usaba 4)<Num value={s.semanasPorMes} onChange={(v) => sup((x) => void (x.semanasPorMes = v || 52 / 12))} /></label>
        </div>

        <TablaFilas
          titulo="Equipo"
          columnas={["Rol", "Pago mensual (COP)", "Dedicación (%)"]}
          filas={s.equipo}
          nueva={{ nombre: "", pagoMensual: 0, dedicacion: 1 }}
          onChange={(f) => sup((x) => void (x.equipo = f))}
          celdas={(r, set) => [
            <input key="n" value={r.nombre} onChange={(e) => set({ ...r, nombre: e.target.value })} />,
            <Num key="p" value={r.pagoMensual} onChange={(v) => set({ ...r, pagoMensual: v })} className="w-36" />,
            <Num key="d" pct value={r.dedicacion} onChange={(v) => set({ ...r, dedicacion: v })} />,
          ]}
        />

        <TablaFilas
          titulo="Herramientas y licencias (USD al mes, se convierten con la TRM del escenario)"
          columnas={["Herramienta", "USD al mes", "Cantidad"]}
          filas={s.herramientas}
          nueva={{ nombre: "", usdMes: 0, cantidad: 1 }}
          onChange={(f) => sup((x) => void (x.herramientas = f))}
          celdas={(r, set) => [
            <input key="n" value={r.nombre} onChange={(e) => set({ ...r, nombre: e.target.value })} />,
            <Num key="u" value={r.usdMes} onChange={(v) => set({ ...r, usdMes: v })} />,
            <Num key="c" value={r.cantidad} onChange={(v) => set({ ...r, cantidad: v })} />,
          ]}
        />

        <TablaFilas
          titulo="Riesgos (impacto en COP si ocurre; probabilidad por escenario)"
          columnas={["Riesgo", "Impacto (COP)", "Cuándo pega", "Prob. pesimista %", "Prob. probable %", "Prob. optimista %"]}
          filas={s.riesgos}
          nueva={{ nombre: "", impacto: 0, momento: "entrega" as Momento, prob: { pesimista: 0.5, probable: 0.3, optimista: 0.1 } }}
          onChange={(f) => sup((x) => void (x.riesgos = f))}
          celdas={(r, set) => [
            <input key="n" value={r.nombre} onChange={(e) => set({ ...r, nombre: e.target.value })} />,
            <Num key="i" value={r.impacto} onChange={(v) => set({ ...r, impacto: v })} className="w-32" />,
            <select key="m" value={r.momento} onChange={(e) => set({ ...r, momento: e.target.value as Momento })}>
              {Object.entries(MOMENTOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>,
            ...ESCENARIOS.map((e) => <Num key={e} pct value={r.prob[e]} onChange={(v) => set({ ...r, prob: { ...r.prob, [e]: v } })} className="w-20" />),
          ]}
        />

        <div>
          <h3 className="text-sm font-semibold mb-2">Escenarios (mínimo / más probable / máximo)</h3>
          <table className="text-sm">
            <thead>
              <tr>
                <th className={TH}>Variable</th>
                {ESCENARIOS.map((e) => <th key={e} className={TH}>{NOMBRE[e]}</th>)}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["duracion", "Duración del desarrollo (semanas)"],
                  ["rezago", "Semanas entre entrega y pago"],
                  ["trm", "TRM"],
                  ["multRiesgo", "Severidad de los riesgos (×)"],
                ] as const
              ).map(([k, label]) => (
                <tr key={k}>
                  <td className={TD}>{label}</td>
                  {ESCENARIOS.map((e) => (
                    <td key={e} className={TD}>
                      <div className="flex gap-1">
                        {(["min", "moda", "max"] as (keyof Rango)[]).map((c) => (
                          <Num key={c} className="w-20" value={s.escenarios[e][k][c]} onChange={(v) => sup((x) => void (x.escenarios[e][k][c] = v))} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className={TD}>Peso en el ponderado (%)</td>
                {ESCENARIOS.map((e) => (
                  <td key={e} className={TD}><Num pct className="w-20" value={s.pesos[e]} onChange={(v) => sup((x) => void (x.pesos[e as Escenario] = v))} /></td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">
            Duración: distribución PERT. Rezago, TRM y severidad: triangular. Cada riesgo ocurre o no según su probabilidad; los mensuales, una vez por cada mes de desarrollo.
          </p>
        </div>
      </section>
    </div>
  );
}

function TablaFilas<T>({
  titulo, columnas, filas, nueva, onChange, celdas,
}: {
  titulo: string;
  columnas: string[];
  filas: T[];
  nueva: T;
  onChange: (f: T[]) => void;
  celdas: (r: T, set: (r: T) => void) => React.ReactNode[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{titulo}</h3>
      <table className="text-sm">
        <thead>
          <tr>
            {columnas.map((c) => <th key={c} className={TH}>{c}</th>)}
            <th className={TH} />
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={i}>
              {celdas(r, (n) => onChange(filas.map((x, j) => (j === i ? n : x)))).map((c, j) => <td key={j} className={TD}>{c}</td>)}
              <td className={TD}>
                <button className="text-xs text-danger" aria-label="Quitar fila" onClick={() => onChange(filas.filter((_, j) => j !== i))}>Quitar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={`${BTN} mt-2`} onClick={() => onChange([...filas, structuredClone(nueva)])}>Agregar</button>
    </div>
  );
}
