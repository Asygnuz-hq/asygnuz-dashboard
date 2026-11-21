"use client";

import { useEffect, useState } from "react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type Props = {
  nombre: string;
  logoUrl: string | null;
  colorAcento: string | null;
  tagline?: string | null;
  /** Clave de sessionStorage para no repetir la apertura en cada clic interno. */
  claveSesion?: string;
  /** En Vista previa de portal-admin se fuerza aunque ya se haya visto. */
  forzar?: boolean;
  onTerminar?: () => void;
};

const DURACION_TOTAL_MS = 2150;
const INICIO_SALIDA_MS = 1720;

export function AperturaLogo({
  nombre,
  logoUrl,
  colorAcento,
  tagline,
  claveSesion,
  forzar = false,
  onTerminar,
}: Props) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (forzar) return true;
    if (typeof window === "undefined") return true;
    if (!claveSesion) return true;
    try {
      return sessionStorage.getItem(claveSesion) !== "1";
    } catch {
      return true;
    }
  });
  const [saliendo, setSaliendo] = useState(false);

  const acento = colorAcento || "#C9A45C";

  useEffect(() => {
    if (!visible) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tSalida = window.setTimeout(
      () => setSaliendo(true),
      reduced ? 420 : INICIO_SALIDA_MS
    );
    const tFin = window.setTimeout(() => {
      if (claveSesion && !forzar) {
        try {
          sessionStorage.setItem(claveSesion, "1");
        } catch {
          // Navegación privada sin sessionStorage.
        }
      }
      setVisible(false);
      onTerminar?.();
    }, reduced ? 720 : DURACION_TOTAL_MS);

    return () => {
      window.clearTimeout(tSalida);
      window.clearTimeout(tFin);
    };
  }, [visible, claveSesion, forzar, onTerminar]);

  function saltar() {
    if (claveSesion && !forzar) {
      try {
        sessionStorage.setItem(claveSesion, "1");
      } catch {
        // noop
      }
    }
    setSaliendo(true);
    window.setTimeout(() => {
      setVisible(false);
      onTerminar?.();
    }, 260);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={`Bienvenida a ${nombre}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        backgroundColor: "#050507",
        opacity: saliendo ? 0 : 1,
        transform: saliendo ? "scale(1.025)" : "scale(1)",
        transition: "opacity 440ms cubic-bezier(0.23, 1, 0.32, 1), transform 440ms cubic-bezier(0.23, 1, 0.32, 1)",
        pointerEvents: saliendo ? "none" : "auto",
      }}
    >
      {/* Resplandor ambiental en el color de marca */}
      <div
        className="portal-halo pointer-events-none absolute h-[520px] w-[520px] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${acento} 26%, transparent) 0%, color-mix(in srgb, ${acento} 8%, transparent) 42%, transparent 72%)`,
          filter: "blur(24px)",
        }}
        aria-hidden
      />

      {/* Haz fino horizontal ("Del negro a la luz") */}
      <div
        className="portal-beam pointer-events-none absolute h-px w-[min(78vw,640px)]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${acento} 80%, #ffffff) 50%, transparent 100%)`,
          boxShadow: `0 0 24px color-mix(in srgb, ${acento} 70%, transparent)`,
        }}
        aria-hidden
      />

      {/* Contenedor del logo con destello diagonal único */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="portal-logo-emerge relative overflow-hidden px-4 py-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={nombre}
              className="max-h-24 sm:max-h-28 w-auto max-w-[min(76vw,380px)] object-contain drop-shadow-[0_10px_32px_rgba(0,0,0,0.65)]"
            />
          ) : (
            <span
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white"
              style={{ fontFamily: FUENTE_DISPLAY }}
            >
              {nombre}
            </span>
          )}
          {/* Destello de luz que cruza una sola vez */}
          <div
            className="portal-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${acento} 42%, rgba(255,255,255,0.65)), transparent)`,
              mixBlendMode: "screen",
            }}
            aria-hidden
          />
        </div>

        <div className="portal-tag-rise flex flex-col items-center gap-2">
          <p
            className="text-[11px] uppercase tracking-[0.28em]"
            style={{ color: `color-mix(in srgb, ${acento} 88%, #ffffff)` }}
          >
            Portal privado
          </p>
          {tagline && (
            <p className="max-w-md text-xs text-white/55 tracking-wide">
              {tagline}
            </p>
          )}
        </div>
      </div>

      {/* Firma discreta y acción para saltar */}
      <div className="portal-tag-rise absolute bottom-8 inset-x-0 flex items-center justify-center gap-6 px-6 text-[11px] text-white/35">
        <span className="tracking-[0.2em] uppercase">ASYGNUZ</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={saltar}
          className="text-white/50 hover:text-white/90 transition-colors cursor-pointer"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
