"use client";

import { useEffect, useState } from "react";
import { Lightning, Sparkle } from "@phosphor-icons/react";
import { DiagramaFlujoVisual } from "@/components/bandeja/DiagramaFlujoVisual";
import type { IgFlujo } from "@/lib/bandeja/tipos";
import { FUENTE_MONO } from "@/lib/portal/fuente";

interface AutomatizacionesPortalData {
  resumenHumano: string;
  flujos: IgFlujo[];
  metricas: {
    totalAtendidos: number;
    totalClics: number;
    flujosActivos: number;
  };
}

export function SeccionAutomatizacionesPortal({ colorAcento }: { colorAcento?: string | null }) {
  const [data, setData] = useState<AutomatizacionesPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/portal/automatizaciones");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error cargando automatizaciones del portal:", err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  if (loading) {
    return (
      <div className="text-xs p-4" style={{ color: "var(--p-muted, var(--muted))" }}>
        Cargando automatizaciones...
      </div>
    );
  }

  const acento = colorAcento || "var(--p-accent, #C9A45C)";
  const acentoInk = `var(--p-accent-ink, ${acento})`;

  if (!data || data.flujos.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 border text-center flex flex-col items-center gap-2.5"
        style={{
          backgroundColor: "var(--p-surface-subtle, var(--surface-alt))",
          borderColor: "var(--p-border, var(--border))",
        }}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: "var(--p-accent-bg, transparent)",
            borderColor: "var(--p-accent-border, var(--border))",
            color: acentoInk,
          }}
        >
          <Lightning size={18} weight="light" />
        </span>
        <p className="text-xs font-semibold" style={{ color: "var(--p-ink, var(--foreground))" }}>
          Automatizaciones de Instagram en preparación
        </p>
        <p className="text-xs max-w-sm leading-relaxed" style={{ color: "var(--p-muted, var(--muted))" }}>
          Tu equipo en ASYGNUZ está configurando los disparadores de respuestas automáticas a comentarios y DMs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen Humano */}
      <div
        className="rounded-2xl p-4 border flex items-start gap-3"
        style={{
          backgroundColor: "var(--p-surface-subtle, var(--surface-alt))",
          borderColor: "var(--p-border, var(--border))",
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: "var(--p-accent-bg, transparent)",
            borderColor: "var(--p-accent-border, var(--border))",
            color: acentoInk,
          }}
        >
          <Sparkle size={16} weight="light" />
        </span>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--p-muted, var(--muted))" }}
          >
            Resumen del mes
          </p>
          <p
            className="text-sm mt-0.5 leading-relaxed font-medium"
            style={{ color: "var(--p-ink, var(--foreground))" }}
          >
            {data.resumenHumano}
          </p>
        </div>
      </div>

      {/* KPI Cards rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Personas atendidas", valor: data.metricas.totalAtendidos },
          { label: "Clics en enlace", valor: data.metricas.totalClics },
          { label: "Flujos activos", valor: data.metricas.flujosActivos },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-3.5 border text-center"
            style={{
              backgroundColor: "var(--p-surface-subtle, var(--surface-alt))",
              borderColor: "var(--p-border, var(--border))",
            }}
          >
            <p className="text-[11px] font-medium" style={{ color: "var(--p-muted, var(--muted))" }}>
              {item.label}
            </p>
            <p
              className="text-xl font-semibold mt-1 tabular-nums"
              style={{ fontFamily: FUENTE_MONO, color: acentoInk }}
            >
              {item.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Diagramas Visuales de solo lectura */}
      <div className="flex flex-col gap-3">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--p-muted, var(--muted))" }}
        >
          Reglas activas de Instagram
        </p>
        {data.flujos.map((flujo) => (
          <DiagramaFlujoVisual key={flujo.id} flujo={flujo} modoSoloLectura={true} />
        ))}
      </div>
    </div>
  );
}
