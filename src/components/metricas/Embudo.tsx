"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export type EtapaEmbudo = {
  etapa: string;
  valor: number;
  porcentajePaso: number;
  tasaConversion: number;
};

export type EmbudoProps = {
  etapas?: EtapaEmbudo[];
  pasos?: EtapaEmbudo[];
  acento?: string;
};

export function Embudo({ etapas, pasos, acento = "var(--acento-cliente)" }: EmbudoProps) {
  const listaPasos = pasos ?? etapas ?? [];
  if (listaPasos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {listaPasos.map((paso, idx) => {
        const ancho = Math.max(paso.porcentajePaso, 25);
        return (
          <div key={paso.etapa} className="flex flex-col gap-1.5">
            {idx > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted -my-1">
                <span>▼</span>
                <span>Paso {paso.tasaConversion}%</span>
              </div>
            )}
            <div className="relative rounded-xl p-3.5 bg-surface-alt/70 border border-border overflow-hidden flex items-center justify-between">
              <div
                className="absolute left-0 top-0 bottom-0 opacity-25 rounded-xl transition-all duration-1000"
                style={{
                  width: `${ancho}%`,
                  background: `linear-gradient(90deg, var(--accent-bright), ${acento})`,
                }}
              />
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="text-xs sm:text-sm font-semibold text-foreground">{paso.etapa}</span>
                <div className="text-right">
                  <span
                    className="text-sm sm:text-base font-bold text-foreground"
                    style={{ fontFamily: FUENTE_DISPLAY }}
                  >
                    {paso.valor.toLocaleString("es-CO")}
                  </span>
                  <span className="text-[11px] text-muted ml-1.5 font-medium">
                    ({idx === 0 ? "100%" : `${paso.tasaConversion}%`})
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
