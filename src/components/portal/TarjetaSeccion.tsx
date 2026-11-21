// Bloque visual compartido entre /portal (Liquid Glass Light/Dark) y
// /portal-admin. Usa exclusivamente variables semánticas (--p-*, --foreground,
// --muted) para garantizar contraste impecable en cualquier tema.

import type { ReactNode } from "react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export function TarjetaSeccion({
  icono,
  titulo,
  subtitulo,
  accion,
  acento,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
  acento?: string;
  children: ReactNode;
}) {
  const colorAcento = acento || "var(--p-accent, #C9A45C)";

  return (
    <section className="portal-bezel">
      <div className="portal-bezel-core overflow-hidden">
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-b"
          style={{ borderColor: "var(--p-border, var(--border))" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: `color-mix(in srgb, ${colorAcento} 14%, var(--p-surface-subtle, var(--surface-alt)))`,
                borderColor: `color-mix(in srgb, ${colorAcento} 32%, var(--p-border, var(--border)))`,
                color: "var(--p-accent-ink, var(--foreground))",
              }}
              aria-hidden
            >
              {icono}
            </span>
            <div className="min-w-0">
              <h2
                className="text-base font-semibold tracking-tight truncate"
                style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink, var(--foreground))" }}
              >
                {titulo}
              </h2>
              {subtitulo && (
                <p className="text-xs truncate" style={{ color: "var(--p-muted, var(--muted))" }}>
                  {subtitulo}
                </p>
              )}
            </div>
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
        <div className="p-6 flex flex-col gap-4">{children}</div>
      </div>
    </section>
  );
}

export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
      <span style={{ color: `color-mix(in srgb, ${color} 58%, var(--p-ink, var(--foreground)))` }}>
        {label}
      </span>
    </span>
  );
}

export const ESTADO_LABEL: Record<string, string> = {
  idea: "Idea",
  grabacion: "Grabación",
  edicion: "Edición",
  revision: "Revisión",
  programado: "Programado",
  publicado: "Publicado",
};

export const ESTADO_COLOR: Record<string, string> = {
  idea: "#64748b",
  grabacion: "#475569",
  edicion: "#2563eb",
  revision: "#b45309",
  programado: "#7c3aed",
  publicado: "#0f766e",
};

export const APROBACION_LABEL: Record<string, string> = {
  pendiente: "Por aprobar",
  aprobado: "Aprobada",
  cambios: "Con ajustes",
};

export const APROBACION_COLOR: Record<string, string> = {
  pendiente: "#64748b",
  aprobado: "#0f766e",
  cambios: "#b45309",
};
