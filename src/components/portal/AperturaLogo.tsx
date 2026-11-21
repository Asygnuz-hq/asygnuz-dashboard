"use client";

import { useEffect, useState } from "react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type Props = {
  nombre: string;
  logoUrl: string | null;
  colorAcento: string | null;
  tagline?: string | null;
  claveSesion?: string;
  forzar?: boolean;
  onTerminar?: () => void;
};

const DURACION_TOTAL_MS = 2100;
const INICIO_SALIDA_MS = 1680;

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
  const acentoTexto = `color-mix(in srgb, ${acento} 72%, #1e293b)`;

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
    }, reduced ? 700 : DURACION_TOTAL_MS);

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
    }, 240);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={`Bienvenida a ${nombre}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        backgroundColor: "#FCFCFD",
        backgroundImage: `radial-gradient(640px circle at 50% 42%, color-mix(in srgb, ${acento} 13%, transparent), transparent 68%)`,
        opacity: saliendo ? 0 : 1,
        transform: saliendo ? "scale(1.02)" : "scale(1)",
        transition:
          "opacity 420ms cubic-bezier(0.23, 1, 0.32, 1), transform 420ms cubic-bezier(0.23, 1, 0.32, 1)",
        pointerEvents: saliendo ? "none" : "auto",
      }}
    >
      {/* Halo arquitectónico sutil */}
      <div
        className="portal-halo pointer-events-none absolute h-[440px] w-[440px] rounded-full border"
        style={{
          borderColor: `color-mix(in srgb, ${acento} 22%, transparent)`,
          background: `radial-gradient(circle, color-mix(in srgb, ${acento} 11%, transparent) 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Línea fina de luz en el color de marca */}
      <div
        className="portal-beam pointer-events-none absolute h-px w-[min(72vw,520px)]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${acento} 75%, transparent) 50%, transparent 100%)`,
        }}
        aria-hidden
      />

      {/* Logo protagonista nítido sobre blanco puro */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="portal-logo-emerge relative overflow-hidden px-5 py-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={nombre}
              className="max-h-24 sm:max-h-28 w-auto max-w-[min(76vw,360px)] object-contain"
            />
          ) : (
            <span
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900"
              style={{ fontFamily: FUENTE_DISPLAY }}
            >
              {nombre}
            </span>
          )}
          {/* Destello luminoso único */}
          <div
            className="portal-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent)",
            }}
            aria-hidden
          />
        </div>

        <div className="portal-tag-rise flex flex-col items-center gap-1.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.26em]"
            style={{ color: acentoTexto }}
          >
            Portal exclusivo de cliente
          </p>
          {tagline && (
            <p className="max-w-md text-xs text-slate-500 tracking-wide">{tagline}</p>
          )}
        </div>
      </div>

      {/* Firma discreta y acción para saltar */}
      <div className="portal-tag-rise absolute bottom-8 inset-x-0 flex items-center justify-center gap-5 px-6 text-[11px] text-slate-400">
        <span className="tracking-[0.22em] uppercase">ASYGNUZ</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={saltar}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer font-medium"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
