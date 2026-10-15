"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TooltipGlass } from "./TooltipGlass";

export type BarraConfig = {
  key: string;
  nombre?: string;
  label?: string;
  color: string;
  stackId?: string;
};

export type GraficaBarrasProps = {
  datos: Record<string, unknown>[];
  xKey?: string;
  claveX?: string;
  barras: BarraConfig[];
  altura?: number;
  horizontal?: boolean;
  apiladas?: boolean;
  onBarClick?: (data: unknown) => void;
  formatoTick?: (val: unknown) => string;
};

export function GraficaBarras({
  datos,
  xKey,
  claveX,
  barras,
  altura = 240,
  horizontal = false,
  apiladas = false,
  onBarClick,
  formatoTick,
}: GraficaBarrasProps) {
  const campoX = claveX ?? xKey ?? "nombre";

  return (
    <div style={{ height: altura, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout={horizontal ? "vertical" : "horizontal"}
          data={datos}
          margin={{ top: 10, right: 10, left: horizontal ? 10 : -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickFormatter={formatoTick ?? ((v) => Number(v).toLocaleString("es-CO"))}
              />
              <YAxis
                type="category"
                dataKey={campoX}
                stroke="var(--foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={campoX}
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatoTick ?? ((v) => Number(v).toLocaleString("es-CO"))}
              />
            </>
          )}
          <Tooltip content={<TooltipGlass />} />
          {barras.map((b) => {
            const stack = b.stackId ?? (apiladas ? "stack-a" : undefined);
            const nombre = b.nombre ?? b.label ?? b.key;
            return (
              <Bar
                key={b.key}
                dataKey={b.key}
                name={nombre}
                fill={b.color}
                stackId={stack}
                radius={stack ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                onClick={(entry) => onBarClick && onBarClick(entry)}
                cursor={onBarClick ? "pointer" : "default"}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
