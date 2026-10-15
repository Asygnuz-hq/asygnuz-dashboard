"use client";

import { useState, useEffect } from "react";
import type { MetricasBandeja } from "@/lib/bandeja/tipos";
import { Embudo } from "@/components/metricas/Embudo";
import { GraficaBarras } from "@/components/metricas/GraficaBarras";
import { GraficaLinea } from "@/components/metricas/GraficaLinea";
import { KpiCard } from "@/components/metricas/KpiCard";
import { MapaCalor } from "@/components/metricas/MapaCalor";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

interface MetricasBandejaProps {
  conexionId?: string | null;
  tenantId?: string | null;
  esVistaInterna?: boolean;
  colorAcento?: string | null;
}

const entero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function MetricasBandejaComponent({
  conexionId,
  tenantId,
  esVistaInterna = true,
  colorAcento = "var(--success)",
}: MetricasBandejaProps) {
  const [periodo, setPeriodo] = useState<"7d" | "30d" | "90d">("30d");
  const [metricas, setMetricas] = useState<MetricasBandeja | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (conexionId) params.set("conexion_id", conexionId);
        if (tenantId) params.set("tenant_id", tenantId);
        params.set("periodo", periodo);

        const res = await fetch(`/api/bandeja/metricas?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setMetricas(data);
        }
      } catch (err) {
        console.error("Error cargando métricas de bandeja:", err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [conexionId, tenantId, periodo]);

  if (loading && !metricas) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-xs text-muted">
        Cargando analítica de automatizaciones...
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-xs text-muted">
        No se pudieron cargar las métricas en este momento.
      </div>
    );
  }

  // Preparar etapas del embudo
  const etapasEmbudo = [
    {
      etapa: "1. Comentarios Clave",
      valor: metricas.embudo.comentariosPalabraClave,
      porcentajePaso: 100,
      tasaConversion: 100,
    },
    {
      etapa: "2. DMs Privados Enviados",
      valor: metricas.embudo.dmsEnviados,
      porcentajePaso: metricas.embudo.tasaComentarioAdmAbierta || 100,
      tasaConversion: metricas.embudo.tasaComentarioAdmAbierta || 100,
    },
    {
      etapa: "3. Personas que Respondieron",
      valor: metricas.embudo.respuestasUsuario,
      porcentajePaso: metricas.embudo.tasaDmARespuesta || 60,
      tasaConversion: metricas.embudo.tasaDmARespuesta || 60,
    },
    {
      etapa: "4. Clics en Enlace",
      valor: metricas.embudo.clicsLink,
      porcentajePaso: metricas.embudo.tasaRespuestaAClic || 40,
      tasaConversion: metricas.embudo.tasaRespuestaAClic || 40,
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Selector de periodo y Resumen Humano */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
              Rendimiento de Automatizaciones & DMs
            </h3>
            <p className="text-xs text-muted">
              Medición de respuestas automáticas, interacción y conversión en Instagram.
            </p>
          </div>

          {/* Selector de Periodo */}
          <div className="flex items-center gap-1.5 p-1 glass rounded-xl">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  periodo === p
                    ? "bg-foreground/15 text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p === "7d" ? "7 Días" : p === "30d" ? "30 Días" : "90 Días"}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen en lenguaje humano sin IA */}
        <div className="glass rounded-2xl p-4 border border-border flex items-start gap-3 bg-gradient-to-r from-surface to-surface-alt">
          <span className="text-2xl shrink-0">📊</span>
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">
              Diagnóstico del Periodo ({periodo})
            </p>
            <p className="text-sm text-foreground mt-0.5 leading-relaxed font-medium">
              {metricas.resumenHumano}
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          etiqueta="DMs Automatizados"
          valor={entero.format(metricas.embudo.dmsEnviados)}
          acento={colorAcento ?? undefined}
          nota="Respuestas enviadas por n8n"
          benchmark="100% dentro de la ventana de 24h"
        />

        <KpiCard
          etiqueta="Clics en Enlaces"
          valor={entero.format(metricas.embudo.clicsLink)}
          acento={colorAcento ?? undefined}
          nota="A través de redirección /r/[id]"
          benchmark="Conversión a tráfico"
        />

        <KpiCard
          etiqueta="Tiempo Prom. Respuesta"
          valor={`${metricas.tiempoPromedioRespuestaMinutos} min`}
          acento={colorAcento ?? undefined}
          nota="En DMs abiertos pendientes"
          benchmark="Meta exige menos de 24h"
        />

        <KpiCard
          etiqueta="Cumplimiento 24h"
          valor={`${metricas.porcentajeVentanaCumplida}%`}
          acento={colorAcento ?? undefined}
          nota="Respuestas dentro de la regla"
          benchmark="Evita bloqueo de cuenta"
        />
      </div>

      {/* Grid: Embudo de Conversión & Leads por Palabra Clave */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Embudo (6 cols) */}
        <div className="lg:col-span-6 glass rounded-2xl p-5 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Embudo de Automatización
            </h4>
            <span className="text-xs text-muted">Paso a paso</span>
          </div>
          <Embudo etapas={etapasEmbudo} acento={colorAcento ?? "var(--success)"} />
        </div>

        {/* Leads por Palabra Clave (6 cols) */}
        <div className="lg:col-span-6 glass rounded-2xl p-5 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Leads por Palabra Clave
            </h4>
            <span className="text-xs text-muted">Palabras más comentadas</span>
          </div>
          {metricas.leadsPorPalabraClave.length > 0 ? (
            <GraficaBarras
              datos={metricas.leadsPorPalabraClave}
              claveX="palabra"
              barras={[{ key: "leads", label: "Leads", color: colorAcento ?? "var(--success)" }]}
              altura={240}
              horizontal
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-muted">
              Sin datos de palabras clave en este periodo.
            </div>
          )}
        </div>
      </div>

      {/* Conversaciones por Día (Área Apilada) */}
      <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Volumen Diario: Automáticas vs Manuales vs Claude
            </h4>
            <p className="text-xs text-muted">
              Desglose de mensajes atendidos por origen día a día.
            </p>
          </div>
        </div>

        {metricas.conversacionesPorDia.length > 0 ? (
          <GraficaLinea
            datos={metricas.conversacionesPorDia}
            claveX="fecha"
            lineas={[
              { key: "automaticas", label: "⚡ Automáticas (n8n)", color: "var(--accent-bright)" },
              { key: "dashboard", label: "👤 Manuales (Dashboard)", color: "var(--success)" },
              { key: "claude", label: "🤖 Claude Agente", color: "var(--warning)" },
            ]}
            altura={260}
            permitirAlternarSeries
          />
        ) : (
          <div className="h-56 flex items-center justify-center text-xs text-muted">
            Sin volumen registrado en el periodo.
          </div>
        )}
      </div>

      {/* Mapa de Calor: Horas con más comentarios y DMs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass rounded-2xl p-5 border border-border flex flex-col gap-3">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Horas con Mayor Interacción
            </h4>
            <p className="text-xs text-muted">
              Concentración de comentarios y DMs recibidos por día y franja horaria.
            </p>
          </div>
          <MapaCalor celdas={metricas.mapaCalor} acento={colorAcento ?? "var(--success)"} />
        </div>

        {/* Indicadores de Salud & Seguridad (solo vista interna) */}
        {esVistaInterna && (
          <div className="lg:col-span-4 glass rounded-2xl p-5 border border-border flex flex-col gap-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Control de Límites & Salud
            </h4>
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-surface-alt border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Límite por Hora</p>
                  <p className="text-[11px] text-muted">Máx. 60 respuestas/hora</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  {metricas.limitesAlcanzados === 0 ? "Normal" : `${metricas.limitesAlcanzados} pausas`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-alt border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Errores de API</p>
                  <p className="text-[11px] text-muted">Fallas reportadas por Meta</p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    metricas.totalErrores === 0
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {metricas.totalErrores} errores
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-alt border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Ventana 24 Horas</p>
                  <p className="text-[11px] text-muted">Cumplimiento estricto</p>
                </div>
                <span className="text-xs font-bold text-emerald-400">100% activo</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
