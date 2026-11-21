"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  CalendarDots,
  ChartBar,
  CheckCircle,
  CheckSquare,
  DownloadSimple,
  FileText,
  FolderSimple,
  GridFour,
  Lightbulb,
  Lightning,
  LinkSimple,
  Notebook,
  Table,
  WarningCircle,
} from "@phosphor-icons/react";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { SeccionAvance, type EstadoAvance } from "./SeccionAvance";
import { TarjetaSeccion, Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import { SeccionAutomatizacionesPortal } from "./SeccionAutomatizacionesPortal";
import { ETIQUETA_TIPO_HOJA, type HojaTrabajo, type TipoHoja } from "@/lib/portal/hojasTipos";

export type ProyectoVista = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tipo_proyecto: string | null;
  descripcion: string | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
};
export type PilarVista = { id: string; icono: string; titulo: string; texto: string };
export type EnlaceVista = { id: string; titulo: string; url: string };
export type ReunionVista = { id: string; titulo: string; fecha: string; notas: string | null };
export type ArchivoVista = { id: string; nombre: string };
export type ContenidoVista = {
  id: string;
  estado: (typeof ESTADOS_CONTENIDO)[number];
  aprobacion_cliente?: "pendiente" | "aprobado" | "cambios" | null;
  visible_cliente?: boolean;
};

function formatearFecha(f: string | null) {
  if (!f) return null;
  return new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function IconoTipoHoja({ tipo }: { tipo: TipoHoja }) {
  switch (tipo) {
    case "ideas":
      return <Lightbulb size={16} weight="regular" />;
    case "benchmarking":
      return <ChartBar size={16} weight="regular" />;
    case "matriz":
      return <GridFour size={16} weight="regular" />;
    case "tomas":
      return <CheckSquare size={16} weight="regular" />;
    default:
      return <Table size={16} weight="regular" />;
  }
}

// Vista unificada del Portal de Cliente — estética blanca arquitectónica
// (Cold Luxury / Editorial Studio) adaptada al logo y color del cliente.
export function VistaPortal({
  nombreTenant,
  logoUrl,
  taglinePortal,
  colorAcento,
  proyecto,
  pilares,
  contenido,
  enlaces,
  archivos,
  reuniones,
  hojas = [],
  hrefParrilla,
  hrefHojas,
  onDescargarArchivo,
  avance,
}: {
  nombreTenant: string | null;
  logoUrl?: string | null;
  taglinePortal?: string | null;
  colorAcento: string | null;
  proyecto: ProyectoVista | null;
  pilares: PilarVista[];
  contenido: ContenidoVista[];
  enlaces: EnlaceVista[];
  archivos: ArchivoVista[];
  reuniones: ReunionVista[];
  hojas?: HojaTrabajo[];
  hrefParrilla: string;
  hrefHojas?: string;
  onDescargarArchivo: (archivo: ArchivoVista) => void;
  avance?: EstadoAvance;
}) {
  const acento = colorAcento || "#C9A45C";
  const acentoInk = `color-mix(in srgb, ${acento} 72%, #1e293b)`;
  const duracion =
    proyecto && (proyecto.fecha_inicio || proyecto.fecha_fin)
      ? `${formatearFecha(proyecto.fecha_inicio) ?? "En curso"} — ${formatearFecha(proyecto.fecha_fin) ?? "Continuo"}`
      : null;

  const porAprobar = contenido.filter(
    (c) => c.estado === "revision" && c.aprobacion_cliente !== "aprobado"
  ).length;
  const aprobadas = contenido.filter((c) => c.aprobacion_cliente === "aprobado").length;
  const publicadas = contenido.filter((c) => c.estado === "publicado").length;

  return (
    <div
      className="flex flex-col gap-9 pb-12"
      style={{ "--portal-accent": acento } as React.CSSProperties}
    >
      {/* Hero arquitectónico luminoso (2 columnas: marca + pulso del proyecto) */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        {/* Acento lineal superior en color de marca */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, ${acento} 0%, color-mix(in srgb, ${acento} 45%, transparent) 55%, transparent 100%)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${acento} 13%, transparent) 0%, transparent 70%)`,
          }}
          aria-hidden
        />

        <div className="relative p-6 sm:p-10 flex flex-col gap-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Columna izquierda: identidad + propuesta + acciones */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={nombreTenant ?? "Portal"}
                    className="h-14 sm:h-16 w-auto max-w-[260px] object-contain self-start"
                  />
                ) : (
                  <h1
                    className="text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.08]"
                    style={{ fontFamily: FUENTE_DISPLAY }}
                  >
                    {nombreTenant ?? "Bienvenido"}
                  </h1>
                )}

                {taglinePortal && (
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: acentoInk }}>
                    {taglinePortal}
                  </p>
                )}

                {proyecto?.descripcion && (
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 max-w-[58ch]">
                    {proyecto.descripcion}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={hrefParrilla}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-transform active:scale-[0.98]"
                >
                  <CalendarDots size={15} weight="regular" style={{ color: acento }} />
                  <span>Abrir parrilla</span>
                </Link>
                {hrefHojas && (
                  <Link
                    href={hrefHojas}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50/80 px-5 py-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-100/80 transition-colors"
                  >
                    <Table size={15} weight="regular" style={{ color: acentoInk }} />
                    <span>Hojas de trabajo</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Columna derecha: Bento de 4 métricas reales del portal */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Piezas en parrilla</span>
                <span
                  className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {contenido.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  {publicadas > 0 ? `${publicadas} publicadas` : "En producción activa"}
                </span>
              </div>

              <div
                className="rounded-2xl border p-4 flex flex-col gap-1"
                style={{
                  borderColor:
                    porAprobar > 0
                      ? `color-mix(in srgb, ${acento} 48%, #e2e8f0)`
                      : "rgba(226, 232, 240, 0.8)",
                  backgroundColor:
                    porAprobar > 0
                      ? `color-mix(in srgb, ${acento} 9%, #ffffff)`
                      : "rgba(248, 250, 252, 0.7)",
                }}
              >
                <span className="text-[11px] font-medium text-slate-500">Por tu aprobación</span>
                <span
                  className="text-2xl font-semibold tracking-tight tabular-nums"
                  style={{ fontFamily: FUENTE_DISPLAY, color: porAprobar > 0 ? acentoInk : "#0F172A" }}
                >
                  {porAprobar}
                </span>
                <span className="text-[11px] text-slate-500">
                  {aprobadas > 0 ? `${aprobadas} aprobadas` : "Todo al día"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Hojas de trabajo</span>
                <span
                  className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {hojas.length}
                </span>
                <span className="text-[11px] text-slate-500">Planes y análisis vivos</span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Sesiones registradas</span>
                <span
                  className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {reuniones.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  {enlaces.length} enlaces · {archivos.length} archivos
                </span>
              </div>
            </div>
          </div>

          {/* Ficha ejecutiva inferior */}
          {(proyecto?.tipo_proyecto || duracion || proyecto?.responsable_nombre) && (
            <div className="grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3">
              {proyecto?.tipo_proyecto && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Alcance del proyecto
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{proyecto.tipo_proyecto}</p>
                </div>
              )}
              {duracion && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Vigencia
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{duracion}</p>
                </div>
              )}
              {proyecto?.responsable_nombre && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Dirección ASYGNUZ
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {proyecto.responsable_nombre}
                    {proyecto.responsable_email && (
                      <>
                        {" · "}
                        <a
                          href={`mailto:${proyecto.responsable_email}`}
                          className="text-xs font-medium underline decoration-slate-300 hover:decoration-slate-700"
                          style={{ color: acentoInk }}
                        >
                          {proyecto.responsable_email}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Panel de avance en vivo (si tiene Kaneo/Meta conectado) */}
      {avance && <SeccionAvance estado={avance} acento={acento} />}

      {/* Hojas de trabajo tipo Excel (protagonistas arriba para acceso inmediato) */}
      {hrefHojas && hojas.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900"
                style={{ fontFamily: FUENTE_DISPLAY }}
              >
                Hojas de trabajo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Planes de campaña, banco de ideas, benchmarking y matriz de oportunidades
              </p>
            </div>
            <Link
              href={hrefHojas}
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline shrink-0"
              style={{ color: acentoInk }}
            >
              Abrir libro completo
              <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hojas.map((h) => (
              <Link
                key={h.id}
                href={`${hrefHojas}?hoja=${h.id}`}
                className="portal-card portal-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${acento} 13%, #f8fafc)`,
                        color: acentoInk,
                      }}
                    >
                      <IconoTipoHoja tipo={h.tipo} />
                    </span>
                    <ArrowUpRight size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold text-slate-900"
                      style={{ fontFamily: FUENTE_DISPLAY }}
                    >
                      {h.titulo}
                    </p>
                    {h.descripcion && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
                        {h.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                  <span className="font-medium text-slate-500">{ETIQUETA_TIPO_HOJA[h.tipo] ?? "Tabla"}</span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {Array.isArray(h.filas) ? h.filas.length : 0} filas
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Resumen estratégico — pilares numerados */}
      {pilares.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900"
                style={{ fontFamily: FUENTE_DISPLAY }}
              >
                Pilares estratégicos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ejes editoriales y comerciales que guían toda la comunicación de la marca
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pilares.map((pl, idx) => (
              <div
                key={pl.id}
                className="portal-card portal-card-interactive rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${acento} 15%, #f8fafc)`,
                      color: acentoInk,
                      fontFamily: FUENTE_DISPLAY,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="text-base font-semibold text-slate-900"
                    style={{ fontFamily: FUENTE_DISPLAY }}
                  >
                    {pl.titulo}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{pl.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parrilla de contenido + aprobaciones */}
      <TarjetaSeccion
        icono={<CalendarDots size={16} weight="regular" />}
        titulo="Parrilla de contenido"
        subtitulo="Calendario de campañas, entregas y aprobaciones"
        acento={acento}
        accion={
          <Link
            href={hrefParrilla}
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: acentoInk }}
          >
            Ver completa
            <ArrowRight size={13} />
          </Link>
        }
      >
        {contenido.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay piezas cargadas en la parrilla.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              {ESTADOS_CONTENIDO.map((estado) => {
                const n = contenido.filter((c) => c.estado === estado).length;
                if (n === 0) return null;
                return (
                  <Chip
                    key={estado}
                    label={`${ESTADO_LABEL[estado]} · ${n}`}
                    color={ESTADO_COLOR[estado]}
                  />
                );
              })}
            </div>

            {(porAprobar > 0 || aprobadas > 0) && (
              <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3.5 text-xs">
                {porAprobar > 0 && (
                  <Link
                    href={hrefParrilla}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${acento} 15%, #ffffff)`,
                      color: acentoInk,
                      border: `1px solid color-mix(in srgb, ${acento} 40%, #e2e8f0)`,
                    }}
                  >
                    <WarningCircle size={14} weight="fill" />
                    <span>
                      {porAprobar}{" "}
                      {porAprobar === 1 ? "pieza esperando tu aprobación" : "piezas esperando tu aprobación"}
                    </span>
                  </Link>
                )}
                {aprobadas > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-teal-700">
                    <CheckCircle size={14} weight="fill" />
                    <span>
                      {aprobadas} {aprobadas === 1 ? "aprobada" : "aprobadas"}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </TarjetaSeccion>

      {/* Automatizaciones de Instagram */}
      <TarjetaSeccion
        icono={<Lightning size={16} weight="regular" />}
        titulo="Automatizaciones de Instagram"
        acento={acento}
      >
        <SeccionAutomatizacionesPortal colorAcento={acento} />
      </TarjetaSeccion>

      {/* Enlaces y Entregables */}
      <div className="grid gap-6 sm:grid-cols-2">
        <TarjetaSeccion
          icono={<LinkSimple size={16} weight="regular" />}
          titulo="Enlaces clave"
          acento={acento}
        >
          {enlaces.length === 0 ? (
            <p className="text-sm text-muted">Sin enlaces cargados todavía.</p>
          ) : (
            <div className="divide-y divide-border -mx-2">
              {enlaces.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
                >
                  <span className="truncate">{e.titulo}</span>
                  <ArrowUpRight size={15} className="shrink-0 text-muted" />
                </a>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          icono={<FolderSimple size={16} weight="regular" />}
          titulo="Documentos y archivos"
          acento={acento}
        >
          {archivos.length === 0 ? (
            <p className="text-sm text-muted">Sin archivos cargados todavía.</p>
          ) : (
            <div className="divide-y divide-border -mx-2">
              {archivos.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onDescargarArchivo(a)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-left text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <FileText size={16} style={{ color: acentoInk }} className="shrink-0" />
                    <span className="truncate">{a.nombre}</span>
                  </span>
                  <DownloadSimple size={15} className="shrink-0 text-muted" />
                </button>
              ))}
            </div>
          )}
        </TarjetaSeccion>
      </div>

      {/* Bitácora de reuniones */}
      <TarjetaSeccion
        icono={<Notebook size={16} weight="regular" />}
        titulo="Bitácora de reuniones"
        acento={acento}
      >
        {reuniones.length === 0 ? (
          <p className="text-sm text-muted">Sin reuniones registradas todavía.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {reuniones.map((r) => (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{r.titulo}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-muted">
                    <CalendarBlank size={12} />
                    {formatearFecha(r.fecha)}
                  </span>
                </div>
                {r.notas && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{r.notas}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </TarjetaSeccion>
    </div>
  );
}
