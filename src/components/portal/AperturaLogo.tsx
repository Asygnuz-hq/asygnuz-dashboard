"use client";

import { useEffect, useState } from "react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import type { ModoPortal } from "@/components/portal/PortalThemeContext";

type Props = {
  nombre: string;
  logoUrl: string | null;
  colorAcento: string | null;
  tagline?: string | null;
  modo?: ModoPortal;
  claveSesion?: string;
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
  modo = "light",
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
  const oscuro = modo === "dark";
  const acentoTexto = oscuro
    ? `color-mix(in srgb, ${acento} 88%, #ffffff)`
    : `color-mix(in srgb, ${acento} 68%, #1e293b)`;

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
        backgroundColor: oscuro ? "#07080B" : "#F6F4F0",
        backgroundImage: oscuro
          ? `radial-gradient(620px circle at 50% 45%, color-mix(in srgb, ${acento} 24%, transparent), transparent 68%)`
          : `radial-gradient(640px circle at 50% 45%, color-mix(in srgb, ${acento} 20%, transparent), transparent 68%)`,
        opacity: saliendo ? 0 : 1,
        transform: saliendo ? "scale(1.02)" : "scale(1)",
        transition:
          "opacity 420ms cubic-bezier(0.23, 1, 0.32, 1), transform 420ms cubic-bezier(0.23, 1, 0.32, 1)",
        pointerEvents: saliendo ? "none" : "auto",
      }}
    >
      {/* Aro arquitectónico de vidrio */}
      <div
        className="portal-halo pointer-events-none absolute h-[420px] w-[420px] rounded-full border"
        style={{
          borderColor: `color-mix(in srgb, ${acento} 28%, transparent)`,
          background: `radial-gradient(circle, color-mix(in srgb, ${acento} ${oscuro ? "18%" : "14%"}, transparent) 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Línea horizontal de luz en color de marca */}
      <div
        className="portal-beam pointer-events-none absolute h-px w-[min(74vw,540px)]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${acento} 85%, ${oscuro ? "#ffffff" : acento}) 50%, transparent 100%)`,
        }}
        aria-hidden
      />

      {/* Logo en pedestal limpio con barrido de brillo */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div
          className="portal-logo-emerge relative overflow-hidden rounded-[2rem] border px-10 py-7"
          style={{
            backgroundColor: oscuro ? "rgba(18, 21, 30, 0.72)" : "rgba(255, 255, 255, 0.78)",
            borderColor: `color-mix(in srgb, ${acento} 32%, ${oscuro ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"})`,
            boxShadow: oscuro
              ? "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 20px 52px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={nombre}
              className="max-h-20 sm:max-h-24 w-auto max-w-[min(70vw,320px)] object-contain"
            />
          ) : (
            <span
              className="text-4xl sm:text-5xl font-semibold tracking-tight"
              style={{ fontFamily: FUENTE_DISPLAY, color: oscuro ? "#F5F4F0" : "#0C1220" }}
            >
              {nombre}
            </span>
          )}
          <div
            className="portal-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
            style={{
              background: oscuro
                ? `linear-gradient(90deg, transparent, color-mix(in srgb, ${acento} 40%, rgba(255,255,255,0.55)), transparent)`
                : "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
            }}
            aria-hidden
          />
        </div>

        <div className="portal-tag-rise flex flex-col items-center gap-1.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.26em]"
            style={{ color: acentoTexto }}
          >
            Portal privado
          </p>
          {tagline && (
            <p
              className="max-w-md text-xs tracking-wide"
              style={{ color: oscuro ? "rgba(245,244,240,0.62)" : "#58657A" }}
            >
              {tagline}
            </p>
          )}
        </div>
      </div>

      {/* Firma discreta y botón Entrar */}
      <div
        className="portal-tag-rise absolute bottom-8 inset-x-0 flex items-center justify-center gap-5 px-6 text-[11px]"
        style={{ color: oscuro ? "rgba(245,244,240,0.42)" : "#64748B" }}
      >
        <span className="tracking-[0.22em] uppercase">ASYGNUZ</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={saltar}
          className="font-semibold transition-opacity hover:opacity-100 opacity-80 cursor-pointer"
          style={{ color: oscuro ? "#F5F4F0" : "#0C1220" }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
