"use client";

import { useState, useEffect, useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";

interface FilaReporte {
  flujo_id: string;
  flujo_nombre: string | null;
  media_id: string;
  disparos: number;
  dms_enviados: number;
  respuestas_publicas: number;
  errores: number;
  limites: number;
  clics: number;
  clics_unicos: number;
}

interface DiaReporte {
  fecha: string;
  comentarios: number;
  disparos: number;
  dms_enviados: number;
  clics_unicos: number;
}

interface Lead {
  evento_id: string;
  recibido_en: string;
  usuario: string | null;
  texto: string | null;
  tipo: string;
  media_id: string | null;
  flujo_nombre: string | null;
  dm_enviado: boolean;
  hubo_error: boolean;
  clics: number;
}

interface Publicacion {
  caption: string | null;
  permalink: string | null;
  imagenUrl: string | null;
}

interface Totales {
  comentarios: number;
  disparos: number;
  dms: number;
  clicsUnicos: number;
}

interface DatosReporte {
  filas: FilaReporte[];
  dias: DiaReporte[];
  entrantes: { comentarios: number; mensajes: number };
  leads: Lead[];
  publicaciones: Record<string, Publicacion>;
  actual: Totales;
  anterior: Totales;
}

function fechaIso(fecha: Date): string {
  return new Date(fecha.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Un DM = un link, así que los clics únicos nunca pasan de los DMs enviados.
function tasa(unicos: number, dms: number): string {
  return dms > 0 ? `${((unicos / dms) * 100).toFixed(1)}%` : "—";
}

function variacion(actual: number, anterior: number): { pct: number } | undefined {
  if (anterior <= 0) return undefined;
  return { pct: ((actual - anterior) / anterior) * 100 };
}

function cortar(texto: string | null, max: number): string {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

const FORMATO_FECHA_LEAD = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// Reporte de la cuenta seleccionada: tarjetas con variación, embudo, actividad por día,
// publicaciones, detalle por flujo, leads y CSV.
export function ReporteFlujos({ conexionId }: { conexionId: string }) {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];

  const [desde, setDesde] = useState(() => fechaIso(new Date(Date.now() - 29 * 86400000)));
  const [hasta, setHasta] = useState(() => fechaIso(new Date()));
  const [datos, setDatos] = useState<DatosReporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams({ conexion_id: conexionId, desde, hasta });

  useEffect(() => {
    if (!conexionId || !desde || !hasta) return;
    let activo = true;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/bandeja/reporte?${new URLSearchParams({ conexion_id: conexionId, desde, hasta })}`
        );
        const data = await res.json();
        if (!activo) return;
        if (!res.ok) {
          setError(data.error ?? "No se pudo cargar el reporte");
          setDatos(null);
        } else {
          setDatos(data);
        }
      } catch {
        if (activo) setError("No se pudo cargar el reporte");
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [conexionId, desde, hasta]);

  // Una tarjeta por publicación: suma los flujos que respondieron a la misma
  const porPublicacion = useMemo(() => {
    const mapa = new Map<string, { disparos: number; dms: number; unicos: number }>();
    for (const f of datos?.filas ?? []) {
      if (!f.media_id) continue;
      const curr = mapa.get(f.media_id) ?? { disparos: 0, dms: 0, unicos: 0 };
      curr.disparos += f.disparos;
      curr.dms += f.dms_enviados;
      curr.unicos += f.clics_unicos;
      mapa.set(f.media_id, curr);
    }
    return Array.from(mapa.entries())
      .map(([mediaId, v]) => ({ mediaId, ...v }))
      .sort((a, b) => b.disparos - a.disparos);
  }, [datos]);

  const actual = datos?.actual;
  const anterior = datos?.anterior;
  const embudo = actual
    ? [
        { etiqueta: "Comentarios recibidos", valor: actual.comentarios },
        { etiqueta: "Dispararon un flujo", valor: actual.disparos },
        { etiqueta: "DMs enviados", valor: actual.dms },
        { etiqueta: "Hicieron clic", valor: actual.clicsUnicos },
      ]
    : [];
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));
  const diasGrafica = (datos?.dias ?? []).map((d) => ({
    ...d,
    etiqueta: d.fecha.slice(8, 10) + "/" + d.fecha.slice(5, 7),
  }));
  const sinActividad = !!datos && datos.filas.length === 0 && datos.entrantes.comentarios === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="glass rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
            />
          </label>
        </div>
        <a
          href={`/api/bandeja/reporte?${params}&formato=csv`}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all text-center"
        >
          Descargar CSV
        </a>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {cargando && !datos && <p className="py-6 text-center text-xs text-muted">Cargando reporte...</p>}

      {datos && actual && anterior && (
        <>
          {/* Tarjetas con variación frente al periodo anterior de la misma duración */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Comentarios"
              value={String(actual.comentarios)}
              count={actual.comentarios}
              hint={`${datos.entrantes.mensajes} DMs recibidos`}
              delta={variacion(actual.comentarios, anterior.comentarios)}
            />
            <KpiCard
              label="DMs enviados"
              value={String(actual.dms)}
              count={actual.dms}
              hint={`${actual.disparos} disparos de flujo`}
              delta={variacion(actual.dms, anterior.dms)}
            />
            <KpiCard
              label="Clics únicos"
              value={String(actual.clicsUnicos)}
              count={actual.clicsUnicos}
              hint="Una persona = un clic"
              delta={variacion(actual.clicsUnicos, anterior.clicsUnicos)}
            />
            <KpiCard
              label="Tasa de clic"
              value={tasa(actual.clicsUnicos, actual.dms)}
              hint="Clics únicos / DMs enviados"
            />
          </div>

          {sinActividad && (
            <p className="py-6 text-center text-xs text-muted">Sin actividad de flujos en este rango.</p>
          )}

          {/* Embudo */}
          {!sinActividad && (
            <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3">
              <h4 className="text-sm font-bold text-foreground">Embudo</h4>
              {embudo.map((e, i) => (
                <div key={e.etiqueta} className="flex items-center gap-3 text-xs">
                  <span className="w-40 shrink-0 text-muted">{e.etiqueta}</span>
                  <div className="flex-1 h-6 rounded-lg bg-surface-alt overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-emerald-500/70 transition-all"
                      style={{ width: `${Math.max(2, (e.valor / maxEmbudo) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-semibold text-foreground">
                    {e.valor}
                    {i > 0 && embudo[i - 1].valor > 0 && (
                      <span className="text-muted font-normal">
                        {" "}
                        · {Math.round((e.valor / embudo[i - 1].valor) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actividad por día */}
          {!sinActividad && diasGrafica.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3">
              <h4 className="text-sm font-bold text-foreground">Actividad por día</h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={diasGrafica}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="etiqueta" stroke={chartColors.axis} fontSize={12} />
                  <YAxis stroke={chartColors.axis} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      color: chartColors.tooltipText,
                    }}
                  />
                  <Line type="monotone" dataKey="comentarios" name="Comentarios" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dms_enviados" name="DMs enviados" stroke="#5c8a72" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clics_unicos" name="Clics únicos" stroke="#f5c542" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Publicaciones */}
          {porPublicacion.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-foreground">Por publicación</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {porPublicacion.map((p) => {
                  const info = datos.publicaciones[p.mediaId];
                  return (
                    <div key={p.mediaId} className="glass rounded-2xl p-4 border border-border flex gap-3">
                      {info?.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={info.imagenUrl}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-surface-alt"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-surface-alt shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-xs text-foreground">
                          {info?.caption ? cortar(info.caption, 90) : `Publicación ${p.mediaId.slice(-6)}`}
                        </p>
                        <p className="text-[11px] text-muted">
                          {p.disparos} disparos · {p.dms} DMs · {p.unicos} clics · {tasa(p.unicos, p.dms)}
                        </p>
                        {info?.permalink && (
                          <a
                            href={info.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-400 hover:underline w-fit"
                          >
                            Ver en Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalle por flujo y publicación */}
          {datos.filas.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3 overflow-x-auto">
              <h4 className="text-sm font-bold text-foreground">Detalle por flujo</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-3 font-semibold">Flujo</th>
                    <th className="py-2 pr-3 font-semibold">Publicación</th>
                    <th className="py-2 pr-3 font-semibold text-right">Disparos</th>
                    <th className="py-2 pr-3 font-semibold text-right">DMs</th>
                    <th className="py-2 pr-3 font-semibold text-right">Públicas</th>
                    <th className="py-2 pr-3 font-semibold text-right">Errores</th>
                    <th className="py-2 pr-3 font-semibold text-right">Límites</th>
                    <th className="py-2 pr-3 font-semibold text-right">Clics</th>
                    <th className="py-2 pr-3 font-semibold text-right">Únicos</th>
                    <th className="py-2 font-semibold text-right">Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.filas.map((f) => (
                    <tr key={`${f.flujo_id}-${f.media_id}`} className="border-b border-border/50 text-foreground">
                      <td className="py-2 pr-3">{f.flujo_nombre ?? "(flujo eliminado)"}</td>
                      <td className="py-2 pr-3 text-muted">
                        {f.media_id ? `…${f.media_id.slice(-6)}` : "Sin publicación"}
                      </td>
                      <td className="py-2 pr-3 text-right">{f.disparos}</td>
                      <td className="py-2 pr-3 text-right">{f.dms_enviados}</td>
                      <td className="py-2 pr-3 text-right">{f.respuestas_publicas}</td>
                      <td className="py-2 pr-3 text-right">{f.errores}</td>
                      <td className="py-2 pr-3 text-right">{f.limites}</td>
                      <td className="py-2 pr-3 text-right">{f.clics}</td>
                      <td className="py-2 pr-3 text-right">{f.clics_unicos}</td>
                      <td className="py-2 text-right">{tasa(f.clics_unicos, f.dms_enviados)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Leads */}
          {datos.leads.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3 overflow-x-auto">
              <h4 className="text-sm font-bold text-foreground">
                Leads ({datos.leads.length}
                {datos.leads.length >= 200 ? "+" : ""})
              </h4>
              <p className="text-[11px] text-muted">
                Quién activó un flujo. Los clics por persona se registran desde que se activó el reporte v2.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-3 font-semibold">Fecha</th>
                    <th className="py-2 pr-3 font-semibold">Usuario</th>
                    <th className="py-2 pr-3 font-semibold">Escribió</th>
                    <th className="py-2 pr-3 font-semibold">Flujo</th>
                    <th className="py-2 pr-3 font-semibold">DM</th>
                    <th className="py-2 font-semibold text-right">Clics</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.leads.map((l) => (
                    <tr key={l.evento_id} className="border-b border-border/50 text-foreground">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {FORMATO_FECHA_LEAD.format(new Date(l.recibido_en))}
                      </td>
                      <td className="py-2 pr-3">{l.usuario ? `@${l.usuario}` : "—"}</td>
                      <td className="py-2 pr-3 text-muted">{cortar(l.texto, 40)}</td>
                      <td className="py-2 pr-3">{l.flujo_nombre ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {l.dm_enviado ? "Enviado" : l.hubo_error ? "Falló" : "—"}
                      </td>
                      <td className="py-2 text-right">{l.clics}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
