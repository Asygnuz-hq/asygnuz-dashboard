"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import type { AvanceCliente, PuntoSerie, TareaAvance } from "@/lib/portal/avanceTipos";
import { TarjetaSeccion, Chip } from "./TarjetaSeccion";

// Panel de Avance dentro del Portal de Cliente: lo que hicimos (Kaneo), lo
// que subimos (parrilla + Instagram), la pauta (Meta Ads) y cómo va la
// cuenta. Mismo componente en /portal (cliente) y en la vista previa de
// /portal-admin, igual que VistaPortal.

export type EstadoAvance = {
  datos: AvanceCliente | null;
  cargando: boolean;
  error: string | null;
};

const ESTADO_TAREA: Record<TareaAvance["estado"], { label: string; color: string }> = {
  hecha: { label: "Hecha", color: "var(--success)" },
  "en-curso": { label: "En curso", color: "var(--accent-bright)" },
  "en-revision": { label: "En revisión", color: "var(--warning)" },
  "por-hacer": { label: "Por hacer", color: "var(--muted)" },
};

const entero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

function dinero(valor: number, moneda: string | null) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda ?? "USD",
      maximumFractionDigits: 0,
    }).format(valor);
  } catch {
    return entero.format(valor);
  }
}

function fechaCorta(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function Kpi({ etiqueta, valor, nota, acento }: { etiqueta: string; valor: string; nota?: string; acento: string }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5" style={{ borderTop: `3px solid ${acento}` }}>
      <p className="text-xs uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="mt-1.5 text-2xl font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
        {valor}
      </p>
      {nota && <p className="mt-1 text-xs text-muted">{nota}</p>}
    </div>
  );
}

function SinConectar({ texto }: { texto: string }) {
  return <p className="text-sm text-muted">{texto}</p>;
}

function ListaTareas({ titulo, tareas }: { titulo: string; tareas: TareaAvance[] }) {
  if (tareas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-muted">{titulo}</p>
      <ul className="flex flex-col divide-y divide-border">
        {tareas.map((t, i) => (
          <li key={`${t.titulo}-${i}`} className="py-2 flex items-center justify-between gap-3">
            <span className="text-sm min-w-0 truncate">{t.titulo}</span>
            <span className="flex items-center gap-3 shrink-0">
              {t.fechaLimite && t.estado !== "hecha" && (
                <span className="text-xs text-muted">{fechaCorta(t.fechaLimite)}</span>
              )}
              <Chip label={ESTADO_TAREA[t.estado].label} color={ESTADO_TAREA[t.estado].color} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Mini gráfica de barras del alcance diario — SVG propio, sin librería,
// para no cargar un paquete de gráficas solo para esto.
function BarrasAlcance({ serie, acento }: { serie: PuntoSerie[]; acento: string }) {
  if (serie.length < 2) return null;
  const max = Math.max(...serie.map((p) => p.valor), 1);
  const ancho = 100 / serie.length;
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-16" role="img" aria-label="Alcance diario, últimos 30 días">
        {serie.map((p, i) => {
          const alto = Math.max((p.valor / max) * 30, 0.5);
          return (
            <rect
              key={p.fecha}
              x={i * ancho + ancho * 0.15}
              y={32 - alto}
              width={ancho * 0.7}
              height={alto}
              rx={0.4}
              fill={acento}
              opacity={0.85}
            >
              <title>{`${fechaCorta(p.fecha)}: ${entero.format(p.valor)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{fechaCorta(serie[0].fecha)}</span>
        <span>{fechaCorta(serie[serie.length - 1].fecha)}</span>
      </div>
    </div>
  );
}

export function SeccionAvance({ estado, acento }: { estado: EstadoAvance; acento: string }) {
  const { datos, cargando, error } = estado;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
          Avance del proyecto
        </h2>
        {datos && (
          <span className="text-xs text-muted">
            Actualizado {new Date(datos.generadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>

      {cargando && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {error && !cargando && <p className="text-sm text-muted">No pudimos cargar el avance: {error}</p>}

      {datos && !cargando && <ContenidoAvance datos={datos} acento={acento} />}
    </section>
  );
}

function ContenidoAvance({ datos, acento }: { datos: AvanceCliente; acento: string }) {
  const { trabajo, contenido, pauta, cuenta } = datos;
  const publicadas = contenido.publicadasInstagramMes ?? contenido.publicadasParrilla;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi
          etiqueta="Tareas entregadas"
          valor={trabajo.conectado ? entero.format(trabajo.hechas) : "—"}
          nota={trabajo.conectado ? `${trabajo.enCurso + trabajo.enRevision} en marcha` : undefined}
          acento={acento}
        />
        <Kpi
          etiqueta={contenido.publicadasInstagramMes !== null ? "Publicaciones este mes" : "Piezas publicadas"}
          valor={entero.format(publicadas)}
          nota={`${contenido.enProduccion} en producción`}
          acento={acento}
        />
        <Kpi
          etiqueta="Inversión en pauta (30 días)"
          valor={pauta.conectado ? dinero(pauta.gasto, pauta.moneda) : "—"}
          nota={pauta.conectado ? `${entero.format(pauta.resultados)} resultados` : undefined}
          acento={acento}
        />
        <Kpi
          etiqueta="Alcance orgánico (30 días)"
          valor={cuenta.alcance30d !== null ? entero.format(cuenta.alcance30d) : "—"}
          nota={cuenta.seguidoresGanados !== null ? `+${entero.format(cuenta.seguidoresGanados)} seguidores` : undefined}
          acento={acento}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TarjetaSeccion icono="✅" titulo="Lo que hemos hecho">
          {!trabajo.conectado ? (
            <SinConectar texto="Pronto verás aquí las tareas de tu proyecto." />
          ) : trabajo.error ? (
            <SinConectar texto={trabajo.error} />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["Hechas", trabajo.hechas],
                  ["En curso", trabajo.enCurso],
                  ["En revisión", trabajo.enRevision],
                  ["Por hacer", trabajo.porHacer],
                ].map(([label, n]) => (
                  <div key={label as string}>
                    <p className="text-xl font-semibold">{n}</p>
                    <p className="text-[11px] text-muted">{label}</p>
                  </div>
                ))}
              </div>
              {trabajo.atrasadas > 0 && (
                <p className="text-xs" style={{ color: "var(--warning)" }}>
                  {trabajo.atrasadas} {trabajo.atrasadas === 1 ? "tarea pasó" : "tareas pasaron"} su fecha límite.
                </p>
              )}
              <ListaTareas titulo="En marcha" tareas={trabajo.enMarcha} />
              <ListaTareas titulo="Próximas entregas (14 días)" tareas={trabajo.proximas} />
              <ListaTareas titulo="Entregado recientemente" tareas={trabajo.ultimasHechas} />
            </>
          )}
        </TarjetaSeccion>

        <div className="flex flex-col gap-6">
          <TarjetaSeccion icono="📣" titulo="Pauta en Meta (últimos 30 días)">
            {!pauta.conectado ? (
              <SinConectar texto="Aún no hay cuenta publicitaria conectada." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold">{entero.format(pauta.impresiones)}</p>
                    <p className="text-[11px] text-muted">Impresiones</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{entero.format(pauta.clics)}</p>
                    <p className="text-[11px] text-muted">Clics</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {pauta.resultados > 0 ? dinero(pauta.gasto / pauta.resultados, pauta.moneda) : "—"}
                    </p>
                    <p className="text-[11px] text-muted">Costo por resultado</p>
                  </div>
                </div>
                {pauta.campanas.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {pauta.campanas.slice(0, 6).map((c, i) => (
                      <li key={`${c.nombre}-${i}`} className="py-2 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">{c.nombre}</span>
                        <span className="shrink-0 text-muted text-xs">
                          {dinero(c.gasto, pauta.moneda)} · {entero.format(c.resultados)} res.
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <SinConectar texto="Sin campañas activas en los últimos 30 días." />
                )}
                {pauta.errores.map((e) => (
                  <p key={e} className="text-xs text-muted">{e}</p>
                ))}
              </>
            )}
          </TarjetaSeccion>

          <TarjetaSeccion icono="📈" titulo={cuenta.usuario ? `Instagram @${cuenta.usuario}` : "Cómo va la cuenta"}>
            {!cuenta.conectado ? (
              <SinConectar texto="Aún no hay cuenta de Instagram conectada." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold">
                      {cuenta.alcance30d !== null ? entero.format(cuenta.alcance30d) : "—"}
                    </p>
                    <p className="text-[11px] text-muted">Alcance</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {cuenta.visitasPerfil30d !== null ? entero.format(cuenta.visitasPerfil30d) : "—"}
                    </p>
                    <p className="text-[11px] text-muted">Visitas al perfil</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {cuenta.seguidoresGanados !== null ? `+${entero.format(cuenta.seguidoresGanados)}` : "—"}
                    </p>
                    <p className="text-[11px] text-muted">Seguidores nuevos</p>
                  </div>
                </div>
                <BarrasAlcance serie={cuenta.serieAlcance} acento={acento} />
                {cuenta.errores.map((e) => (
                  <p key={e} className="text-xs text-muted">{e}</p>
                ))}
              </>
            )}
          </TarjetaSeccion>
        </div>
      </div>
    </div>
  );
}
