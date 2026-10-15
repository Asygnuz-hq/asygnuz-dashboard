"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TooltipGlass } from "./TooltipGlass";

export type SerieConfig = {
  key: string;
  nombre?: string;
  label?: string;
  color: string;
  yAxisId?: "left" | "right";
  ejeY?: string;
  formatoTick?: (v: number) => string;
};

export type GraficaLineaProps = {
  datos: Record<string, unknown>[];
  xKey?: string;
  claveX?: string;
  series?: SerieConfig[];
  lineas?: SerieConfig[];
  altura?: number;
  dobleEje?: boolean;
  leyendaClicable?: boolean;
  permitirAlternarSeries?: boolean;
};

export function GraficaLinea({
  datos,
  xKey,
  claveX,
  series,
  lineas,
  altura = 280,
  dobleEje = false,
  leyendaClicable = true,
  permitirAlternarSeries,
}: GraficaLineaProps) {
  const campoX = claveX ?? xKey ?? "fecha";
  const listaSeries = (lineas ?? series ?? []).map((s) => ({
    ...s,
    nombre: s.nombre ?? s.label ?? s.key,
    yAxisId: (s.yAxisId ?? (s.ejeY === "right" ? "right" : "left")) as "left" | "right",
  }));

  const puedeAlternar = permitirAlternarSeries ?? leyendaClicable;

  const [visibilidad, setVisibilidad] = useState<Record<string, boolean>>(() =>
    listaSeries.reduce((acc, s) => ({ ...acc, [s.key]: true }), {})
  );

  function alternarSerie(key: string) {
    if (!puedeAlternar) return;
    setVisibilidad((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const tieneEjeDerecho = dobleEje || listaSeries.some((s) => s.yAxisId === "right");

  return (
    <div className="flex flex-col gap-3 w-full">
      {puedeAlternar && (
        <div className="flex items-center gap-2 flex-wrap">
          {listaSeries.map((s) => {
            const visible = visibilidad[s.key] !== false;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => alternarSerie(s.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  visible
                    ? "bg-surface-alt text-foreground border-border"
                    : "opacity-40 border-transparent text-muted"
                }`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span>{s.nombre}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ height: altura, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey={campoX}
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => Number(v).toLocaleString("es-CO")}
            />
            {tieneEjeDerecho && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString("es-CO")}
              />
            )}
            <Tooltip content={<TooltipGlass />} />
            {listaSeries.map((s) => (
              <Line
                key={s.key}
                yAxisId={s.yAxisId}
                type="monotone"
                dataKey={s.key}
                name={s.nombre}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 2, fill: s.color }}
                activeDot={{ r: 5 }}
                hide={visibilidad[s.key] === false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
