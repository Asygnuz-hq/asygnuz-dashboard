"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCOP, formatDate, formatPercent } from "@/lib/format";
import { PLANTILLA, indicadores, type Supuestos } from "@/lib/casos/modelo";
import { PLANTILLA_MENSUALIDAD, margenMesTipico, type SupuestosMensualidad } from "@/lib/casos/mensualidad";
import { TIPOS, type TipoNegocio } from "@/components/casos/ui";
import { ETAPA, ETAPAS, esGanado, probDe, type EtapaId } from "@/lib/casos/etapas";

type Fila = {
  id: string;
  nombre: string;
  cliente: string | null;
  precio: number;
  tipo: TipoNegocio;
  supuestos: Supuestos | SupuestosMensualidad;
  etapa: EtapaId;
  prob_cierre: number | null;
  fecha_cierre: string | null;
  responsable: string | null;
  actualizado_en: string;
};

const millones = (x: number) => `${(x / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
const CHIP = "text-xs rounded-full border px-2.5 py-1";

// Valor del negocio: proyecto = su precio; mensualidad = fee × meses mínimos + montaje (lo que asegura el contrato).
function valorYMargen(c: Fila) {
  if (c.tipo === "mensualidad") {
    const s = c.supuestos as SupuestosMensualidad;
    return { valor: c.precio * s.mesesMinimo + s.montaje.cobro, margen: margenMesTipico(s, c.precio) };
  }
  return { valor: c.precio, margen: c.precio > 0 ? indicadores(c.supuestos as Supuestos, "probable", c.precio).margen : null };
}

export default function NegociosPage() {
  const router = useRouter();
  const [casos, setCasos] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState<TipoNegocio>("proyecto");
  const [creando, setCreando] = useState(false);
  const [filtro, setFiltro] = useState<"abiertos" | "todos" | EtapaId>("abiertos");

  useEffect(() => {
    createClient()
      .from("casos_negocio")
      .select("id, nombre, cliente, precio, tipo, supuestos, etapa, prob_cierre, fecha_cierre, responsable, actualizado_en")
      .order("actualizado_en", { ascending: false })
      .then(({ data, error }) =>
        error
          ? setError(error.message)
          : setCasos(
              (data ?? []).map((c) => ({
                ...c,
                precio: Number(c.precio),
                prob_cierre: c.prob_cierre === null ? null : Number(c.prob_cierre),
                tipo: c.tipo === "mensualidad" ? "mensualidad" : "proyecto",
                supuestos: { ...(c.tipo === "mensualidad" ? PLANTILLA_MENSUALIDAD : PLANTILLA), ...c.supuestos },
              })) as Fila[],
            ),
      );
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    const { data, error } = await createClient()
      .from("casos_negocio")
      .insert({
        nombre: nombre.trim(),
        cliente: cliente.trim() || null,
        precio: 0,
        tipo,
        supuestos: tipo === "mensualidad" ? PLANTILLA_MENSUALIDAD : PLANTILLA,
        etapa: "diagnostico",
      })
      .select("id")
      .single();
    setCreando(false);
    if (error) return setError(error.message);
    router.push(`/crm/casos-negocio/${data.id}`);
  }

  async function moverEtapa(id: string, etapa: EtapaId) {
    const ahora = new Date().toISOString();
    const antes = casos;
    setCasos((cs) => cs?.map((c) => (c.id === id ? { ...c, etapa, actualizado_en: ahora } : c)) ?? cs);
    const { error } = await createClient()
      .from("casos_negocio")
      .update({ etapa, etapa_desde: ahora, actualizado_en: ahora })
      .eq("id", id);
    if (error) {
      setCasos(antes);
      setError(error.message);
    }
  }

  // Margen sin azar (flujo probable o mes típico) al precio cotizado: barato de calcular para toda la lista.
  const filas = useMemo(
    () =>
      (casos ?? []).map((c) => {
        const prob = probDe(c.etapa, c.prob_cierre);
        const { valor, margen } = valorYMargen(c);
        return { ...c, prob, valor, ponderado: valor * prob, margen };
      }),
    [casos],
  );

  const kpis = useMemo(() => {
    const abiertos = filas.filter((f) => ETAPA[f.etapa]?.abierta);
    const ganados = filas.filter((f) => esGanado(f.etapa));
    const perdidos = filas.filter((f) => f.etapa === "perdido");
    const cerrados = ganados.length + perdidos.length;
    return {
      enJuego: abiertos.reduce((a, f) => a + f.valor, 0),
      ponderado: abiertos.reduce((a, f) => a + f.ponderado, 0),
      nAbiertos: abiertos.length,
      ganado: ganados.reduce((a, f) => a + f.valor, 0),
      nGanados: ganados.length,
      tasa: cerrados ? ganados.length / cerrados : null,
      cerrados,
    };
  }, [filas]);

  const porEtapa = useMemo(
    () => ETAPAS.map((e) => ({ ...e, n: filas.filter((f) => f.etapa === e.id).length, valor: filas.filter((f) => f.etapa === e.id).reduce((a, f) => a + f.valor, 0) })),
    [filas],
  );

  const visibles = filas
    .filter((f) => (filtro === "todos" ? true : filtro === "abiertos" ? ETAPA[f.etapa]?.abierta : f.etapa === filtro))
    .sort((a, b) => ETAPAS.findIndex((e) => e.id === a.etapa) - ETAPAS.findIndex((e) => e.id === b.etapa));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Negocios"
        subtitle="En qué va cada proyecto, cuánto vale y cuánto cobrar. Cada negocio tiene su caso: precio sugerido, margen y riesgo con 10.000 simulaciones."
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {!!casos?.length && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="En juego" value={millones(kpis.enJuego)} hint={`${kpis.nAbiertos} abiertos. Mensualidades: fee × meses mínimos + montaje`} />
          <KpiCard label="Ponderado" value={millones(kpis.ponderado)} hint="En juego × probabilidad de cierre de cada uno" />
          <KpiCard label="Ganado" value={millones(kpis.ganado)} hint={`${kpis.nGanados} negocios (ganado, en desarrollo o entregado)`} />
          <KpiCard
            label="Tasa de cierre"
            value={kpis.tasa === null ? "—" : formatPercent(kpis.tasa)}
            hint={kpis.cerrados ? `Ganados sobre ${kpis.cerrados} cerrados (ganados + perdidos)` : "Aún no hay negocios cerrados"}
          />
        </section>
      )}

      {!!casos?.length && (
        <section className="glass rounded-2xl border p-4 flex flex-col gap-3">
          <h2 className="font-display text-lg">Embudo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {porEtapa.map((e) => (
              <button
                key={e.id}
                onClick={() => setFiltro(filtro === e.id ? "abiertos" : e.id)}
                className={`rounded-xl border p-3 text-left hover:bg-surface-alt ${filtro === e.id ? "border-accent" : "border-border"}`}
              >
                <div className="text-xs text-muted">{e.nombre}</div>
                <div className="text-lg font-semibold">{e.n}</div>
                <div className="text-xs text-muted">{e.valor ? millones(e.valor) : "—"}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={crear} className="glass rounded-2xl border p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Proyecto
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="App de agendamiento" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cliente (opcional)
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNegocio)}>
            {(Object.keys(TIPOS) as TipoNegocio[]).map((t) => (
              <option key={t} value={t}>{TIPOS[t]}</option>
            ))}
          </select>
        </label>
        <button disabled={creando} className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50">
          {creando ? "Creando…" : "Nuevo negocio"}
        </button>
        <p className="text-xs text-muted w-full">Entra en Diagnóstico. Proyecto: plantilla del Excel (Senior + Medium + Claude Code y 5 riesgos). Mensualidad: estratega, diseñadora y community; luego ajústala.</p>
      </form>

      {!casos && !error && <p className="text-sm text-muted">Cargando…</p>}
      {casos?.length === 0 && <p className="text-sm text-muted">Todavía no hay negocios.</p>}
      {!!casos?.length && (
        <section className="glass rounded-2xl border p-4 flex flex-col gap-3 overflow-x-auto">
          <div className="flex flex-wrap gap-2">
            {(["abiertos", "todos"] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)} className={`${CHIP} ${filtro === f ? "border-accent text-accent" : "border-border"}`}>
                {f === "abiertos" ? "Abiertos" : "Todos"}
              </button>
            ))}
            {filtro !== "abiertos" && filtro !== "todos" && <span className={`${CHIP} border-accent text-accent`}>{ETAPA[filtro].nombre}</span>}
          </div>
          {visibles.length === 0 ? (
            <p className="text-sm text-muted">No hay negocios en este filtro.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-3 py-2">Proyecto</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Etapa</th>
                  <th className="text-right px-3 py-2">Precio cotizado</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-right px-3 py-2">Prob.</th>
                  <th className="text-right px-3 py-2">Ponderado</th>
                  <th className="text-right px-3 py-2">Margen probable</th>
                  <th className="px-3 py-2">Cierre est.</th>
                  <th className="px-3 py-2">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-2">
                      <Link href={`/crm/casos-negocio/${c.id}`} className="text-accent underline">
                        {c.nombre}
                      </Link>
                      <div className="text-xs text-muted">{TIPOS[c.tipo]}</div>
                    </td>
                    <td className="px-3 py-2">{c.cliente ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select value={c.etapa} onChange={(e) => moverEtapa(c.id, e.target.value as EtapaId)} className="text-sm">
                        {ETAPAS.map((e) => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right px-3 py-2">
                      {c.precio ? `${formatCOP(c.precio)}${c.tipo === "mensualidad" ? " /mes" : ""}` : "Sin definir"}
                    </td>
                    <td className="text-right px-3 py-2">{c.valor ? millones(c.valor) : "—"}</td>
                    <td className="text-right px-3 py-2">{formatPercent(c.prob)}</td>
                    <td className="text-right px-3 py-2">{c.valor ? millones(c.ponderado) : "—"}</td>
                    <td className={`text-right px-3 py-2 ${c.margen !== null && c.margen < 0 ? "text-danger" : ""}`}>
                      {c.margen === null ? "—" : formatPercent(c.margen)}
                    </td>
                    <td className="px-3 py-2">{c.fecha_cierre ? formatDate(c.fecha_cierre) : "—"}</td>
                    <td className="px-3 py-2">{c.responsable ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted">
            Margen probable: proyecto, escenario probable sin azar; mensualidad, margen de un mes típico. Para el riesgo completo abre el negocio. La probabilidad sale de la etapa salvo que el negocio tenga una propia.
          </p>
        </section>
      )}
    </div>
  );
}
