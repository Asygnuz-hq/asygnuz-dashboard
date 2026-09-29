// Bloque visual compartido entre /portal (lo que ve el cliente) y
// /portal-admin (donde ASYGNUZ lo carga) — mismo look en los dos lados a
// propósito, para que lo que JM arma se vea igual a lo que ella recibe.
// Inspirado en los "callouts" con ícono de Notion: encabezado con color
// propio en vez de un simple <h2>, tarjeta con borde redondeado.

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export function TarjetaSeccion({
  icono,
  titulo,
  children,
}: {
  icono: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-alt">
        <span className="text-lg leading-none" aria-hidden>
          {icono}
        </span>
        <h2 className="text-sm font-semibold tracking-wide" style={{ fontFamily: FUENTE_DISPLAY }}>{titulo}</h2>
      </div>
      <div className="p-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

// Puntito + texto de color, sin fondo relleno — el estilo que JM eligió
// entre las 2 propuestas (opción "oscura"). Usa los tokens de tema
// (--success, --warning, --accent-bright, --muted), no colores fijos: sigue
// funcionando igual si cambia de tema claro/oscuro.
export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
      <span style={{ color }}>{label}</span>
    </span>
  );
}

export const ESTADO_LABEL: Record<string, string> = {
  grabacion: "Grabación",
  revision: "Revisión",
  edicion: "Edición",
  publicado: "Publicado",
};
// Mismo criterio de color que labels.ts de Kaneo: gris = por hacer, ámbar =
// en revisión, azul = en curso, verde = terminado.
export const ESTADO_COLOR: Record<string, string> = {
  grabacion: "var(--muted)",
  revision: "var(--warning)",
  edicion: "var(--accent-bright)",
  publicado: "var(--success)",
};
