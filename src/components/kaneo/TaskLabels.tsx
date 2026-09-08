import type { KaneoTaskLabel } from "@/lib/kaneo/client";

// Misma paleta nombrada que apps/web/src/components/kanban-board/task-labels.tsx
// en Kaneo -- si una etiqueta no matchea ninguno de estos nombres, se asume
// que "color" ya es un valor CSS válido (hex, nombre de color) y se usa tal cual.
const COLORES: Record<string, string> = {
  gray: "#78716c",
  "dark-gray": "#64748b",
  purple: "#8b5cf6",
  teal: "#059669",
  green: "#16a34a",
  yellow: "#d97706",
  orange: "#ea580c",
  pink: "#e11d48",
  red: "#dc2626",
};

function colorValido(valor: string): string {
  return COLORES[valor] ?? valor;
}

export function TaskLabels({ labels }: { labels: KaneoTaskLabel[] }) {
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: colorValido(label.color) }} />
          {label.name}
        </span>
      ))}
    </div>
  );
}
