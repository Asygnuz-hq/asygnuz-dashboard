"use client";

import { useEffect, useState } from "react";
import { DiagramaFlujoVisual } from "@/components/bandeja/DiagramaFlujoVisual";
import type { IgFlujo } from "@/lib/bandeja/tipos";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

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
    return <div className="text-xs text-muted p-4">Cargando automatizaciones...</div>;
  }

  if (!data || data.flujos.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-alt p-6 border border-border text-center flex flex-col items-center gap-2">
        <span className="text-2xl">⚡</span>
        <p className="text-xs font-semibold text-foreground">Automatizaciones de Instagram en preparación</p>
        <p className="text-[11px] text-muted max-w-sm">
          Tu equipo en ASYGNUZ está configurando los disparadores de respuestas automáticas a comentarios y DMs.
        </p>
      </div>
    );
  }

  const acento = colorAcento || "var(--success)";

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen Humano */}
      <div className="rounded-2xl p-4.5 bg-surface-alt border border-border flex items-start gap-3">
        <span className="text-2xl shrink-0">✨</span>
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Resumen del Mes
          </p>
          <p className="text-sm text-foreground mt-0.5 leading-relaxed font-medium">
            {data.resumenHumano}
          </p>
        </div>
      </div>

      {/* KPI Cards rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-alt p-3.5 border border-border text-center">
          <p className="text-[10px] uppercase font-bold text-muted">Personas Atendidas</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
            {data.metricas.totalAtendidos}
          </p>
        </div>
        <div className="rounded-xl bg-surface-alt p-3.5 border border-border text-center">
          <p className="text-[10px] uppercase font-bold text-muted">Clics en Enlace</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
            {data.metricas.totalClics}
          </p>
        </div>
        <div className="rounded-xl bg-surface-alt p-3.5 border border-border text-center">
          <p className="text-[10px] uppercase font-bold text-muted">Flujos Activos</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
            {data.metricas.flujosActivos}
          </p>
        </div>
      </div>

      {/* Diagramas Visuales tipo ManyChat de solo lectura */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Tus Reglas Activas de Instagram
        </p>
        {data.flujos.map((flujo) => (
          <DiagramaFlujoVisual key={flujo.id} flujo={flujo} modoSoloLectura={true} />
        ))}
      </div>
    </div>
  );
}
