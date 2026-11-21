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
import { FUENTE_DISPLAY, FUENTE_MONO } from "@/lib/portal/fuente";
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
      return <Lightbulb size={17} weight="light" />;
    case "benchmarking":
      return <ChartBar size={17} weight="light" />;
    case "matriz":
      return <GridFour size={17} weight="light" />;
    case "tomas":
      return <CheckSquare size={17} weight="light" />;
    default:
      return <Table size={17} weight="light" />;
  }
}

// Vista unificada del Portal Exclusivo de Cliente — Sistema Liquid Atelier Glass
// (Light + Dark). 100% gobernada por variables semánticas --p-* para blindar
// contraste ≥ 4.5:1 en cualquier tema y color de marca.
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
      className="flex flex-col gap-10 pb-12"
      style={{ "--portal-accent": acento } as React.CSSProperties}
    >
      {/* Hero Liquid Atelier Glass (Double-Bezel + Asimetría Editorial) */}
      <section className="portal-bezel">
        <div className="portal-bezel-core relative overflow-hidden">
          {/* Filete superior de luz de marca */}
          <div
            className="h-[2px] w-full"
            style={{
              background: `linear-gradient(90deg, ${acento} 0%, color-mix(in srgb, ${acento} 42%, transparent) 52%, transparent 100%)`,
            }}
            aria-hidden
          />
          {/* Orbe ambiental interno para profundidad de vidrio */}
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${acento} 22%, transparent) 0%, transparent 68%)`,
            }}
            aria-hidden
          />

          <div className="relative p-6 sm:p-10 flex flex-col gap-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Columna izquierda: identidad + propuesta + acciones */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div className="flex flex-col gap-3.5">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={nombreTenant ?? "Portal"}
                      className="h-14 sm:h-16 w-auto max-w-[260px] object-contain self-start"
                    />
                  ) : (
                    <h1
                      className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.06]"
                      style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
                    >
                      {nombreTenant ?? "Bienvenido"}
                    </h1>
                  )}

                  {taglinePortal && (
                    <h1
                      className="text-xl sm:text-[1.75rem] font-semibold tracking-tight leading-[1.18] max-w-[30ch]"
                      style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
                    >
                      {taglinePortal}
                    </h1>
                  )}

                  {proyecto?.descripcion && (
                    <p
                      className="text-sm sm:text-[15px] leading-relaxed max-w-[56ch]"
                      style={{ color: "var(--p-ink-soft)" }}
                    >
                      {proyecto.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link href={hrefParrilla} className="portal-cta">
                    <span>Abrir parrilla</span>
                    <span
                      className="portal-cta-orb"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--p-btn-fg) 14%, transparent)",
                      }}
                    >
                      <ArrowUpRight size={14} weight="bold" />
                    </span>
                  </Link>

                  {hrefHojas && (
                    <Link
                      href={hrefHojas}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors active:scale-[0.98]"
                      style={{
                        borderColor: "var(--p-border-strong)",
                        backgroundColor: "var(--p-surface-subtle)",
                        color: "var(--p-ink)",
                      }}
                    >
                      <Table size={15} weight="light" style={{ color: "var(--p-accent-ink)" }} />
                      <span>Hojas de trabajo</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Columna derecha: Panel de pulso operativo (Ledger de cristal) */}
              <div className="lg:col-span-5">
                <div
                  className="rounded-2xl border p-5 flex flex-col divide-y"
                  style={{
                    borderColor: "var(--p-border)",
                    backgroundColor: "var(--p-surface-subtle)",
                    boxShadow: "var(--p-highlight)",
                  }}
                >
                  <div
                    className="flex items-center justify-between gap-4 pb-3.5"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--p-ink)" }}>
                        Piezas en parrilla
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--p-muted)" }}>
                        {publicadas > 0 ? `${publicadas} publicadas` : "En producción activa"}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-semibold tabular-nums tracking-tight"
                      style={{ fontFamily: FUENTE_MONO, color: "var(--p-ink)" }}
                    >
                      {String(contenido.length).padStart(2, "0")}
                    </span>
                  </div>

                  <Link
                    href={hrefParrilla}
                    className="flex items-center justify-between gap-4 py-3.5 group"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <div>
                      <p
                        className="text-xs font-semibold flex items-center gap-2"
                        style={{ color: "var(--p-ink)" }}
                      >
                        <span>Por tu aprobación</span>
                        {porAprobar > 0 && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: acento }}
                            aria-hidden
                          />
                        )}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--p-muted)" }}>
                        {aprobadas > 0 ? `${aprobadas} aprobadas hasta hoy` : "Revisión en un clic"}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-semibold tabular-nums tracking-tight"
                      style={{
                        fontFamily: FUENTE_MONO,
                        color: porAprobar > 0 ? "var(--p-accent-ink)" : "var(--p-ink)",
                      }}
                    >
                      {String(porAprobar).padStart(2, "0")}
                    </span>
                  </Link>

                  <div
                    className="flex items-center justify-between gap-4 py-3.5"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--p-ink)" }}>
                        Hojas de trabajo
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--p-muted)" }}>
                        Campañas, ideas y benchmarking vivos
                      </p>
                    </div>
                    <span
                      className="text-2xl font-semibold tabular-nums tracking-tight"
                      style={{ fontFamily: FUENTE_MONO, color: "var(--p-ink)" }}
                    >
                      {String(hojas.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between gap-4 pt-3.5"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--p-ink)" }}>
                        Sesiones y entregables
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--p-muted)" }}>
                        {enlaces.length} enlaces clave · {archivos.length} documentos
                      </p>
                    </div>
                    <span
                      className="text-2xl font-semibold tabular-nums tracking-tight"
                      style={{ fontFamily: FUENTE_MONO, color: "var(--p-ink)" }}
                    >
                      {String(reuniones.length).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ficha ejecutiva inferior */}
            {(proyecto?.tipo_proyecto || duracion || proyecto?.responsable_nombre) && (
              <div
                className="grid gap-5 border-t pt-6 sm:grid-cols-3"
                style={{ borderColor: "var(--p-border)" }}
              >
                {proyecto?.tipo_proyecto && (
                  <div>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "var(--p-muted)" }}
                    >
                      Alcance del proyecto
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: "var(--p-ink)" }}
                    >
                      {proyecto.tipo_proyecto}
                    </p>
                  </div>
                )}
                {duracion && (
                  <div>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "var(--p-muted)" }}
                    >
                      Vigencia
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold tabular-nums"
                      style={{ color: "var(--p-ink)" }}
                    >
                      {duracion}
                    </p>
                  </div>
                )}
                {proyecto?.responsable_nombre && (
                  <div>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "var(--p-muted)" }}
                    >
                      Dirección ASYGNUZ
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: "var(--p-ink)" }}
                    >
                      {proyecto.responsable_nombre}
                      {proyecto.responsable_email && (
                        <>
                          {" · "}
                          <a
                            href={`mailto:${proyecto.responsable_email}`}
                            className="text-xs font-medium underline underline-offset-4"
                            style={{ color: "var(--p-accent-ink)" }}
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
        </div>
      </section>

      {/* Panel de avance en vivo (si tiene Kaneo/Meta conectado) */}
      {avance && <SeccionAvance estado={avance} acento={acento} />}

      {/* Hojas de trabajo tipo Excel — Bento asimétrico con vista previa real */}
      {hrefHojas && hojas.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2
                className="text-xl sm:text-2xl font-semibold tracking-tight"
                style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
              >
                Hojas de trabajo
              </h2>
              <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--p-muted)" }}>
                Planes de campaña, banco de ideas, benchmarking y matriz de oportunidades
              </p>
            </div>
            <Link
              href={hrefHojas}
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-4 shrink-0"
              style={{ color: "var(--p-accent-ink)" }}
            >
              <span>Abrir libro completo</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            {hojas.map((h, idx) => {
              const destacada = idx === 0 && hojas.length >= 2;
              const colSpan =
                hojas.length === 1
                  ? "md:col-span-6"
                  : destacada
                    ? "md:col-span-4"
                    : idx === 1
                      ? "md:col-span-2"
                      : hojas.length === 4
                        ? "md:col-span-3"
                        : "md:col-span-2";

              const filas = Array.isArray(h.filas) ? h.filas : [];
              const colsPreview = Array.isArray(h.columnas) ? h.columnas.slice(0, 3) : [];
              const filasPreview = filas.slice(0, 3);

              return (
                <Link
                  key={h.id}
                  href={`${hrefHojas}?hoja=${h.id}`}
                  className={`${colSpan} portal-glass portal-card-interactive rounded-3xl p-6 flex flex-col justify-between gap-5`}
                >
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                        style={{
                          backgroundColor: "var(--p-accent-bg)",
                          borderColor: "var(--p-accent-border)",
                          color: "var(--p-accent-ink)",
                        }}
                      >
                        <IconoTipoHoja tipo={h.tipo} />
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                        style={{
                          borderColor: "var(--p-border)",
                          backgroundColor: "var(--p-surface-subtle)",
                          color: "var(--p-muted)",
                        }}
                      >
                        <span>{ETIQUETA_TIPO_HOJA[h.tipo] ?? "Tabla"}</span>
                        <ArrowUpRight size={13} style={{ color: "var(--p-accent-ink)" }} />
                      </span>
                    </div>

                    <div>
                      <h3
                        className={`${destacada ? "text-lg" : "text-base"} font-semibold tracking-tight`}
                        style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
                      >
                        {h.titulo}
                      </h3>
                      {h.descripcion && (
                        <p
                          className="text-xs leading-relaxed mt-1 line-clamp-2"
                          style={{ color: "var(--p-muted)" }}
                        >
                          {h.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Mini vista previa viva en la hoja principal */}
                    {destacada && colsPreview.length > 0 && filasPreview.length > 0 && (
                      <div
                        className="rounded-2xl border overflow-hidden mt-1"
                        style={{
                          borderColor: "var(--p-border)",
                          backgroundColor: "var(--p-surface-subtle)",
                        }}
                      >
                        <div
                          className="grid grid-cols-3 gap-2 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider border-b"
                          style={{
                            borderColor: "var(--p-border)",
                            backgroundColor: "var(--p-table-head)",
                            color: "var(--p-muted)",
                          }}
                        >
                          {colsPreview.map((col) => (
                            <span key={col.key} className="truncate">
                              {col.label}
                            </span>
                          ))}
                        </div>
                        <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
                          {filasPreview.map((fila) => (
                            <div
                              key={fila.id}
                              className="grid grid-cols-3 gap-2 px-3.5 py-2 text-xs"
                              style={{ borderColor: "var(--p-border)" }}
                            >
                              {colsPreview.map((col, cIdx) => {
                                const val = fila[col.key];
                                const texto =
                                  typeof val === "boolean"
                                    ? val
                                      ? "Sí"
                                      : "Pendiente"
                                    : String(val ?? "—") || "—";
                                return (
                                  <span
                                    key={col.key}
                                    className={`truncate ${cIdx === 0 ? "font-medium" : ""}`}
                                    style={{
                                      color: cIdx === 0 ? "var(--p-ink)" : "var(--p-muted)",
                                    }}
                                  >
                                    {texto}
                                  </span>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-between border-t pt-3.5 text-xs"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <span style={{ color: "var(--p-muted)" }}>Registros activos</span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{ fontFamily: FUENTE_MONO, color: "var(--p-ink)" }}
                    >
                      {filas.length} {filas.length === 1 ? "fila" : "filas"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Pilares estratégicos — Bloque editorial en grilla arquitectónica */}
      {pilares.length > 0 && (
        <section className="flex flex-col gap-5">
          <div>
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
            >
              Pilares estratégicos
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--p-muted)" }}>
              Ejes editoriales y comerciales que guían la comunicación de la marca
            </p>
          </div>

          <div className="portal-bezel">
            <div className="portal-bezel-core overflow-hidden">
              <div className="grid md:grid-cols-2">
                {pilares.map((pl, idx) => (
                  <div
                    key={pl.id}
                    className="p-6 sm:p-7 flex flex-col gap-3 border-b md:odd:border-r last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                    style={{ borderColor: "var(--p-border)" }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ fontFamily: FUENTE_MONO, color: "var(--p-accent-ink)" }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3
                        className="text-base font-semibold tracking-tight"
                        style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
                      >
                        {pl.titulo}
                      </h3>
                    </div>
                    <p
                      className="text-sm leading-relaxed pl-7"
                      style={{ color: "var(--p-ink-soft)" }}
                    >
                      {pl.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Parrilla de contenido + aprobaciones */}
      <TarjetaSeccion
        icono={<CalendarDots size={17} weight="light" />}
        titulo="Parrilla de contenido"
        subtitulo="Calendario de campañas, entregas y aprobaciones"
        acento={acento}
        accion={
          <Link
            href={hrefParrilla}
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-4"
            style={{ color: "var(--p-accent-ink)" }}
          >
            <span>Ver completa</span>
            <ArrowRight size={13} />
          </Link>
        }
      >
        {contenido.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--p-muted)" }}>
            Todavía no hay piezas cargadas en la parrilla.
          </p>
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
              <div
                className="flex flex-wrap items-center gap-4 border-t pt-4 text-xs"
                style={{ borderColor: "var(--p-border)" }}
              >
                {porAprobar > 0 && (
                  <Link
                    href={hrefParrilla}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold"
                    style={{
                      backgroundColor: "var(--p-accent-bg)",
                      color: "var(--p-accent-ink)",
                      borderColor: "var(--p-accent-border)",
                    }}
                  >
                    <WarningCircle size={14} weight="fill" />
                    <span>
                      {porAprobar}{" "}
                      {porAprobar === 1
                        ? "pieza esperando tu aprobación"
                        : "piezas esperando tu aprobación"}
                    </span>
                  </Link>
                )}
                {aprobadas > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 font-semibold"
                    style={{ color: "var(--success)" }}
                  >
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
        icono={<Lightning size={17} weight="light" />}
        titulo="Automatizaciones de Instagram"
        acento={acento}
      >
        <SeccionAutomatizacionesPortal colorAcento={acento} />
      </TarjetaSeccion>

      {/* Enlaces y Entregables */}
      <div className="grid gap-6 sm:grid-cols-2">
        <TarjetaSeccion
          icono={<LinkSimple size={17} weight="light" />}
          titulo="Enlaces clave"
          acento={acento}
        >
          {enlaces.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Sin enlaces cargados todavía.
            </p>
          ) : (
            <div className="divide-y -mx-2" style={{ borderColor: "var(--p-border)" }}>
              {enlaces.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: "var(--p-ink)", borderColor: "var(--p-border)" }}
                >
                  <span className="truncate">{e.titulo}</span>
                  <ArrowUpRight size={15} className="shrink-0" style={{ color: "var(--p-muted)" }} />
                </a>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          icono={<FolderSimple size={17} weight="light" />}
          titulo="Documentos y archivos"
          acento={acento}
        >
          {archivos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Sin archivos cargados todavía.
            </p>
          ) : (
            <div className="divide-y -mx-2" style={{ borderColor: "var(--p-border)" }}>
              {archivos.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onDescargarArchivo(a)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors cursor-pointer"
                  style={{ color: "var(--p-ink)", borderColor: "var(--p-border)" }}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <FileText
                      size={16}
                      weight="light"
                      style={{ color: "var(--p-accent-ink)" }}
                      className="shrink-0"
                    />
                    <span className="truncate">{a.nombre}</span>
                  </span>
                  <DownloadSimple
                    size={15}
                    className="shrink-0"
                    style={{ color: "var(--p-muted)" }}
                  />
                </button>
              ))}
            </div>
          )}
        </TarjetaSeccion>
      </div>

      {/* Bitácora de reuniones */}
      <TarjetaSeccion
        icono={<Notebook size={17} weight="light" />}
        titulo="Bitácora de reuniones"
        acento={acento}
      >
        {reuniones.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--p-muted)" }}>
            Sin reuniones registradas todavía.
          </p>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--p-border)" }}>
            {reuniones.map((r) => (
              <div
                key={r.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col gap-1.5"
                style={{ borderColor: "var(--p-border)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--p-ink)" }}>
                    {r.titulo}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums"
                    style={{
                      borderColor: "var(--p-border)",
                      backgroundColor: "var(--p-surface-subtle)",
                      color: "var(--p-muted)",
                    }}
                  >
                    <CalendarBlank size={12} />
                    {formatearFecha(r.fecha)}
                  </span>
                </div>
                {r.notas && (
                  <p
                    className="whitespace-pre-wrap text-xs leading-relaxed"
                    style={{ color: "var(--p-ink-soft)" }}
                  >
                    {r.notas}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </TarjetaSeccion>
    </div>
  );
}
