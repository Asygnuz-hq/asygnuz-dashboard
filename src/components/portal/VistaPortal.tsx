"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  CalendarDots,
  CheckCircle,
  DownloadSimple,
  FileText,
  FolderSimple,
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
import { ETIQUETA_TIPO_HOJA, type HojaTrabajo } from "@/lib/portal/hojasTipos";
import { colorTextoSobreAcento } from "@/lib/portal/subdominio";

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

// Vista unificada del Portal de Cliente — idéntica en /portal y en la vista
// previa de /portal-admin. Estética editorial oscura adaptada al color y
// logo del cliente.
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
  const textoSobreAcento = colorTextoSobreAcento(acento);
  const duracion =
    proyecto && (proyecto.fecha_inicio || proyecto.fecha_fin)
      ? `${formatearFecha(proyecto.fecha_inicio) ?? "En curso"} — ${formatearFecha(proyecto.fecha_fin) ?? "Continuo"}`
      : null;

  const porAprobar = contenido.filter(
    (c) => c.estado === "revision" && c.aprobacion_cliente !== "aprobado"
  ).length;
  const aprobadas = contenido.filter((c) => c.aprobacion_cliente === "aprobado").length;

  return (
    <div
      className="flex flex-col gap-10 pb-12"
      style={{ "--portal-accent": acento } as React.CSSProperties}
    >
      {/* Hero editorial exclusivo */}
      <section
        className="relative overflow-hidden rounded-3xl border px-6 py-8 sm:px-10 sm:py-11"
        style={{
          backgroundColor: "#0B0C10",
          borderColor: `color-mix(in srgb, ${acento} 26%, rgba(255,255,255,0.08))`,
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${acento} 22%, transparent) 0%, transparent 68%)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-0 top-0 h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, ${acento} 0%, color-mix(in srgb, ${acento} 35%, transparent) 45%, transparent 100%)`,
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col gap-4 max-w-2xl">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={nombreTenant ?? "Portal"}
                  className="h-12 sm:h-14 w-auto max-w-[260px] object-contain self-start"
                />
              ) : (
                <h1
                  className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {nombreTenant ?? "Bienvenido"}
                </h1>
              )}

              {logoUrl && (
                <h1
                  className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {nombreTenant}
                </h1>
              )}

              {(taglinePortal || proyecto?.descripcion) && (
                <p className="text-sm sm:text-[15px] leading-relaxed text-white/70 max-w-[60ch]">
                  {proyecto?.descripcion || taglinePortal}
                </p>
              )}
            </div>

            {/* Acciones principales (una sola línea, sin duplicar intención) */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href={hrefParrilla}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide transition-transform active:scale-[0.98]"
                style={{ backgroundColor: acento, color: textoSobreAcento }}
              >
                <CalendarDots size={15} weight="bold" />
                <span>Abrir parrilla</span>
              </Link>
              {hrefHojas && (
                <Link
                  href={hrefHojas}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-white hover:border-white/30 transition-colors"
                >
                  <Table size={15} weight="light" style={{ color: acento }} />
                  <span>Hojas de trabajo</span>
                </Link>
              )}
            </div>
          </div>

          {/* Barra ejecutiva integrada */}
          {(proyecto?.tipo_proyecto || duracion || proyecto?.responsable_nombre) && (
            <div className="grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
              {proyecto?.tipo_proyecto && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Alcance</p>
                  <p className="mt-1 text-sm font-medium text-white">{proyecto.tipo_proyecto}</p>
                </div>
              )}
              {duracion && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Vigencia</p>
                  <p className="mt-1 text-sm font-medium text-white">{duracion}</p>
                </div>
              )}
              {proyecto?.responsable_nombre && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Dirección ASYGNUZ</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {proyecto.responsable_nombre}
                    {proyecto.responsable_email && (
                      <>
                        {" · "}
                        <a
                          href={`mailto:${proyecto.responsable_email}`}
                          className="text-xs font-normal underline decoration-white/30 hover:decoration-white"
                          style={{ color: acento }}
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

      {/* Resumen estratégico — pilares numerados */}
      {pilares.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-tight text-white"
              style={{ fontFamily: FUENTE_DISPLAY }}
            >
              Pilares estratégicos
            </h2>
            <span className="text-xs text-white/45">{pilares.length} ejes de marca</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pilares.map((pl, idx) => (
              <div
                key={pl.id}
                className="portal-card portal-card-interactive rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-xs font-semibold tracking-[0.16em]"
                    style={{ color: acento, fontFamily: FUENTE_DISPLAY }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-white/[0.07]" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-white" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {pl.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-white/65">{pl.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parrilla de contenido + estado de aprobaciones */}
      <TarjetaSeccion
        icono={<CalendarDots size={16} weight="regular" />}
        titulo="Parrilla de contenido"
        subtitulo="Calendario editorial, guiones y aprobaciones"
        acento={acento}
        accion={
          <Link
            href={hrefParrilla}
            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            style={{ color: acento }}
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
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
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
              <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-3.5 text-xs">
                {porAprobar > 0 && (
                  <Link
                    href={hrefParrilla}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${acento} 16%, transparent)`,
                      color: acento,
                      border: `1px solid color-mix(in srgb, ${acento} 35%, transparent)`,
                    }}
                  >
                    <WarningCircle size={14} weight="fill" />
                    <span>
                      {porAprobar} {porAprobar === 1 ? "pieza esperando tu aprobación" : "piezas esperando tu aprobación"}
                    </span>
                  </Link>
                )}
                {aprobadas > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400/90">
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

      {/* Hojas de trabajo tipo Excel */}
      {hrefHojas && hojas.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-xl font-semibold tracking-tight text-white"
                style={{ fontFamily: FUENTE_DISPLAY }}
              >
                Hojas de trabajo
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Planes de campaña, banco de ideas y análisis competitivo en formato tabla
              </p>
            </div>
            <Link
              href={hrefHojas}
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline shrink-0"
              style={{ color: acento }}
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
                className="portal-card portal-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${acento} 14%, transparent)`,
                        color: acento,
                      }}
                    >
                      {ETIQUETA_TIPO_HOJA[h.tipo] ?? "Tabla"}
                    </span>
                    <ArrowUpRight size={15} className="text-white/40" />
                  </div>
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: FUENTE_DISPLAY }}>
                    {h.titulo}
                  </p>
                  {h.descripcion && (
                    <p className="text-xs text-white/55 line-clamp-2 leading-relaxed">{h.descripcion}</p>
                  )}
                </div>
                <p className="text-[11px] text-white/40 border-t border-white/[0.06] pt-2.5">
                  {Array.isArray(h.filas) ? h.filas.length : 0} registros
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

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
            <div className="divide-y divide-white/[0.06] -mx-2">
              {enlaces.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-sm text-white/85 hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  <span className="truncate">{e.titulo}</span>
                  <ArrowUpRight size={15} className="shrink-0 text-white/40" />
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
            <div className="divide-y divide-white/[0.06] -mx-2">
              {archivos.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onDescargarArchivo(a)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-sm text-left text-white/85 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <FileText size={15} style={{ color: acento }} className="shrink-0" />
                    <span className="truncate">{a.nombre}</span>
                  </span>
                  <DownloadSimple size={15} className="shrink-0 text-white/40" />
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
          <div className="flex flex-col divide-y divide-white/[0.06]">
            {reuniones.map((r) => (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{r.titulo}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                    <CalendarBlank size={13} />
                    {formatearFecha(r.fecha)}
                  </span>
                </div>
                {r.notas && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/60">{r.notas}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </TarjetaSeccion>
    </div>
  );
}
