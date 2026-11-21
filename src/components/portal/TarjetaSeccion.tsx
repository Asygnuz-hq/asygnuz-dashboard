// Bloque visual compartido entre /portal (tema claro arquitectónico) y
// /portal-admin (tema del dashboard). Usa tokens semánticos (--surface,
// --surface-alt, --border, --foreground, --muted) para verse impecable en ambos.

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
  const acentoInk = acento ? `color-mix(in srgb, ${acento} 76%, var(--foreground))` : "var(--foreground)";

  return (
    <section className="portal-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-surface-alt/65">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm"
            style={{
              backgroundColor: acento
                ? `color-mix(in srgb, ${acento} 14%, transparent)`
                : "var(--surface)",
              color: acentoInk,
            }}
            aria-hidden
          >
            {icono}
          </span>
          <div className="min-w-0">
            <h2
              className="text-sm font-semibold tracking-tight text-foreground truncate"
              style={{ fontFamily: FUENTE_DISPLAY }}
            >
              {titulo}
            </h2>
            {subtitulo && <p className="text-[11px] text-muted truncate">{subtitulo}</p>}
          </div>
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
      <span style={{ color }}>{label}</span>
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
