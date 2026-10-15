"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type AnilloProgresoProps = {
  porcentaje: number;
  maximo?: number;
  tamano?: number;
  grosor?: number;
  anchoTrazo?: number;
  color?: string;
  etiquetaPrincipal?: string;
  etiquetaSecundaria?: string;
  subetiqueta?: string;
  formato?: (val: number) => string;
};

export function AnilloProgreso({
  porcentaje,
  maximo = 100,
  tamano = 150,
  grosor = 12,
  anchoTrazo,
  color = "var(--success)",
  etiquetaPrincipal,
  etiquetaSecundaria,
  subetiqueta,
  formato,
}: AnilloProgresoProps) {
  const trazoReal = anchoTrazo ?? grosor;
  const radio = (tamano - trazoReal) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const porcentajeNormalizado = maximo === 100 ? porcentaje : (porcentaje / maximo) * 100;
  const progresoClamp = Math.min(Math.max(porcentajeNormalizado, 0), 100);
  const offset = circunferencia - (progresoClamp / 100) * circunferencia;

  const textoCentro = etiquetaPrincipal ?? (formato ? formato(porcentaje) : `${Math.round(porcentaje)}%`);
  const subtitulo = etiquetaSecundaria ?? subetiqueta;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="transform -rotate-90">
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke="color-mix(in srgb, var(--border) 60%, transparent)"
          strokeWidth={trazoReal}
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke={color}
          strokeWidth={trazoReal}
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="font-bold tracking-tight text-foreground leading-none"
          style={{
            fontFamily: FUENTE_DISPLAY,
            fontSize: tamano >= 110 ? "1.5rem" : tamano >= 80 ? "1.1rem" : "0.95rem",
          }}
        >
          {textoCentro}
        </span>
        {subtitulo && (
          <span className="text-[10px] text-muted mt-1 max-w-[90px] leading-tight">
            {subtitulo}
          </span>
        )}
      </div>
    </div>
  );
}
