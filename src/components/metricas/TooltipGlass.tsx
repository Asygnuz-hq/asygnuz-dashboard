"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export type PayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  [key: string]: unknown;
};

export type TooltipGlassProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
  formatoValor?: (val: number, name?: string) => string;
};

export function TooltipGlass({ active, payload, label, formatoValor }: TooltipGlassProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass rounded-xl p-3 border border-border shadow-xl text-xs flex flex-col gap-1.5 min-w-[140px] z-50">
      {label && <p className="font-semibold text-muted border-b border-border/60 pb-1">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const color = entry.color || entry.fill || "var(--accent-bright)";
          const valor = formatoValor ? formatoValor(Number(entry.value), entry.name) : Number(entry.value).toLocaleString("es-CO");
          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{entry.name}</span>
              </span>
              <span className="font-semibold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
                {valor}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
