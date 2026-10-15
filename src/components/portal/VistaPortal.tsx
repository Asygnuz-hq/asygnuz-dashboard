"use client";

import Link from "next/link";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { SeccionAvance, type EstadoAvance } from "./SeccionAvance";
import { TarjetaSeccion, Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import { SeccionAutomatizacionesPortal } from "./SeccionAutomatizacionesPortal";

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
export type ContenidoVista = { id: string; estado: (typeof ESTADOS_CONTENIDO)[number] };

function formatearFecha(f: string | null) {
  if (!f) return null;
  return new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

// La pantalla que ve el cliente al entrar a su portal — un solo componente
// para que /portal (el cliente, datos vía RLS) y la Vista previa de
// /portal-admin (ASYGNUZ, datos vía la API de admin) sean pixel-a-pixel lo
// mismo. Nunca se edita el diseño en un lado sin que se refleje en el otro.
export function VistaPortal({
  nombreTenant,
  colorAcento,
  proyecto,
  pilares,
  contenido,
  enlaces,
  archivos,
  reuniones,
  hrefParrilla,
  onDescargarArchivo,
  avance,
}: {
  nombreTenant: string | null;
  colorAcento: string | null;
  proyecto: ProyectoVista | null;
  pilares: PilarVista[];
  contenido: ContenidoVista[];
  enlaces: EnlaceVista[];
  archivos: ArchivoVista[];
  reuniones: ReunionVista[];
  hrefParrilla: string;
  onDescargarArchivo: (archivo: ArchivoVista) => void;
  // Panel de Avance (Kaneo + Meta + parrilla). Opcional: si no se pasa, el
  // portal se ve como antes.
  avance?: EstadoAvance;
}) {
  const acento = colorAcento || "var(--success)";
  const duracion = proyecto && (proyecto.fecha_inicio || proyecto.fecha_fin)
    ? `${formatearFecha(proyecto.fecha_inicio) ?? "—"} → ${formatearFecha(proyecto.fecha_fin) ?? "—"}`
    : null;

  return (
    <div className="flex flex-col gap-8 pb-10 -m-6">
      <div className="relative overflow-hidden px-6 sm:px-10 py-10" style={{ backgroundColor: acento, color: "#FAF9F5" }}>
        <div
          className="absolute -right-24 -top-32 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "color-mix(in srgb, #FAF9F5 70%, transparent)" }}>
            Portal de cliente · ASYGNUZ Growth
          </span>
          <h1 className="text-4xl font-semibold leading-tight" style={{ fontFamily: FUENTE_DISPLAY }}>
            {nombreTenant ?? "Bienvenido"}
          </h1>
          {proyecto?.descripcion && <p className="text-sm leading-relaxed opacity-90">{proyecto.descripcion}</p>}
          {proyecto?.responsable_email && (
            <p className="text-sm opacity-80">
              Cualquier duda, escríbenos a{" "}
              <a className="underline" href={`mailto:${proyecto.responsable_email}`} style={{ color: "#FAF9F5" }}>
                {proyecto.responsable_email}
              </a>
              .
            </p>
          )}
        </div>
      </div>

      <div className="px-6 sm:px-10 flex flex-col gap-8">
        {(proyecto?.tipo_proyecto || duracion || proyecto?.responsable_nombre) && (
          <div className="grid gap-4 sm:grid-cols-3">
            {proyecto?.tipo_proyecto && (
              <div className="glass glass-hover rounded-2xl p-5" style={{ borderTop: `3px solid ${acento}` }}>
                <p className="text-xs uppercase tracking-wide text-muted">Alcance</p>
                <p className="mt-1.5 text-base font-semibold">{proyecto.tipo_proyecto}</p>
              </div>
            )}
            {duracion && (
              <div className="glass glass-hover rounded-2xl p-5" style={{ borderTop: `3px solid ${acento}` }}>
                <p className="text-xs uppercase tracking-wide text-muted">Duración</p>
                <p className="mt-1.5 text-base font-semibold">{duracion}</p>
              </div>
            )}
            {proyecto?.responsable_nombre && (
              <div className="glass glass-hover rounded-2xl p-5" style={{ borderTop: `3px solid ${acento}` }}>
                <p className="text-xs uppercase tracking-wide text-muted">Responsable ASYGNUZ</p>
                <p className="mt-1.5 text-base font-semibold">{proyecto.responsable_nombre}</p>
              </div>
            )}
          </div>
        )}

        {avance && <SeccionAvance estado={avance} acento={acento} />}

        {pilares.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
              Resumen estratégico
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pilares.map((pl) => (
                <div key={pl.id} className="glass glass-hover rounded-2xl p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `color-mix(in srgb, ${acento} 18%, transparent)` }}
                      aria-hidden
                    >
                      {pl.icono}
                    </span>
                    <span className="text-sm font-bold">{pl.titulo}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{pl.texto}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <TarjetaSeccion icono="🚀" titulo="Parrilla de contenido">
          {contenido.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay contenido cargado.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {ESTADOS_CONTENIDO.map((estado) => (
                <Chip
                  key={estado}
                  label={`${ESTADO_LABEL[estado]} · ${contenido.filter((c) => c.estado === estado).length}`}
                  color={ESTADO_COLOR[estado]}
                />
              ))}
            </div>
          )}
          <Link href={hrefParrilla} className="text-sm underline w-fit">
            Ver parrilla completa →
          </Link>
        </TarjetaSeccion>

        <TarjetaSeccion icono="⚡" titulo="Automatizaciones de Instagram">
          <SeccionAutomatizacionesPortal colorAcento={colorAcento} />
        </TarjetaSeccion>

        <div className="grid gap-6 sm:grid-cols-2">
          <TarjetaSeccion icono="🔗" titulo="Enlaces">
            {enlaces.length === 0 ? (
              <p className="text-sm text-muted">Sin enlaces todavía.</p>
            ) : (
              <div className="rounded-lg bg-surface-alt divide-y divide-border overflow-hidden -m-1">
                {enlaces.map((e) => (
                  <a
                    key={e.id}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface"
                  >
                    {e.titulo} <span className="text-muted">→</span>
                  </a>
                ))}
              </div>
            )}
          </TarjetaSeccion>

          <TarjetaSeccion icono="📁" titulo="Archivos">
            {archivos.length === 0 ? (
              <p className="text-sm text-muted">Sin archivos todavía.</p>
            ) : (
              <div className="rounded-lg bg-surface-alt divide-y divide-border overflow-hidden -m-1">
                {archivos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onDescargarArchivo(a)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface"
                  >
                    📄 {a.nombre} <span className="text-muted">⬇</span>
                  </button>
                ))}
              </div>
            )}
          </TarjetaSeccion>
        </div>

        <TarjetaSeccion icono="📝" titulo="Reuniones">
          {reuniones.length === 0 ? (
            <p className="text-sm text-muted">Sin reuniones registradas todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reuniones.map((r) => (
                <div key={r.id} className="rounded-lg bg-surface-alt p-3 text-sm">
                  <p className="font-medium">
                    {r.titulo} <span className="text-xs text-muted font-normal">— {formatearFecha(r.fecha)}</span>
                  </p>
                  {r.notas && <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{r.notas}</p>}
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>
      </div>
    </div>
  );
}
