"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { TooltipGlass } from "./TooltipGlass";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export type ElementoDona = {
  nombre?: string;
  formato?: string;
  valor?: number;
  porcentaje?: number;
  color?: string;
  [key: string]: unknown;
};

export type GraficaDonaProps = {
  datos: ElementoDona[];
  claveNombre?: string;
  claveValor?: string;
  altura?: number;
  radioInterno?: number;
  radioExterno?: number;
  centroTexto?: { principal: string; secundario?: string } | string;
  textoCentro?: string;
  mostrarLeyenda?: boolean;
};

const PALETA_DEFAULT = [
  "var(--success)",
  "var(--accent-bright)",
  "var(--warning)",
  "#a855f7",
  "#3b82f6",
  "#ec4899",
  "var(--muted)",
];

export function GraficaDona({
  datos,
  claveNombre,
  claveValor,
  altura = 200,
  radioInterno = 55,
  radioExterno = 80,
  centroTexto,
  textoCentro,
  mostrarLeyenda = true,
}: GraficaDonaProps) {
  // Normalizar datos para que Recharts y la leyenda siempre tengan nombre, valor y color
  const datosNormalizados = datos.map((d, i) => {
    const nombre = (claveNombre ? (d[claveNombre] as string) : d.nombre || d.formato || `Ítem ${i + 1}`) ?? "";
    const valor = Number(claveValor ? d[claveValor] : d.valor ?? d.porcentaje ?? 0);
    const color = d.color || PALETA_DEFAULT[i % PALETA_DEFAULT.length];
    return { ...d, nombre, valor, color };
  });

  const textoPrincipal =
    typeof centroTexto === "string"
      ? centroTexto
      : centroTexto?.principal ?? textoCentro;
  const textoSecundario =
    typeof centroTexto === "object" ? centroTexto.secundario : undefined;

  return (
    <div className="flex flex-col items-center justify-center w-full relative">
      <div style={{ height: altura, width: "100%", position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datosNormalizados}
              dataKey="valor"
              nameKey="nombre"
              innerRadius={radioInterno}
              outerRadius={radioExterno}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {datosNormalizados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipGlass />} />
          </PieChart>
        </ResponsiveContainer>

        {textoPrincipal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-lg font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
              {textoPrincipal}
            </span>
            {textoSecundario && (
              <span className="text-[10px] text-muted uppercase tracking-wider">
                {textoSecundario}
              </span>
            )}
          </div>
        )}
      </div>

      {mostrarLeyenda && (
        <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
          {datosNormalizados.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span>{d.nombre}</span>
              <span className="font-semibold text-foreground">
                {d.valor.toLocaleString("es-CO")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
