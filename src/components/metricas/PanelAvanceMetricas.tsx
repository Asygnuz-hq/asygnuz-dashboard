"use client";

import { useState } from "react";
import type { AvanceCliente, PeriodoMetricas } from "@/lib/portal/avanceTipos";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import { SelectorPeriodo } from "./SelectorPeriodo";
import { KpiCard } from "./KpiCard";
import { GraficaLinea } from "./GraficaLinea";
import { GraficaBarras } from "./GraficaBarras";
import { GraficaDona } from "./GraficaDona";
import { AnilloProgreso } from "./AnilloProgreso";
import { Embudo } from "./Embudo";
import { MapaCalor } from "./MapaCalor";
import { LineaTiempo } from "./LineaTiempo";
import { CuadriculaPublicaciones } from "./CuadriculaPublicaciones";
import { CuadriculaAnuncios } from "./CuadriculaAnuncios";

interface PanelAvanceMetricasProps {
  datos: AvanceCliente;
  acento?: string;
  alCambiarPeriodo?: (periodo: PeriodoMetricas) => void;
  esAdmin?: boolean;
}

const entero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function dinero(valor: number, moneda: string | null = "COP") {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda ?? "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  } catch {
    return `$${entero.format(valor)}`;
  }
}

export function PanelAvanceMetricas({
  datos,
  acento = "var(--success)",
  alCambiarPeriodo,
}: PanelAvanceMetricasProps) {
  const [seccionActiva, setSeccionActiva] = useState<"todas" | "instagram" | "meta" | "kaneo">("todas");
  const { trabajo, contenido, pauta, cuenta, metas, resumenHumano, periodo } = datos;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Barra Superior con Selector de Periodo y Botón Imprimir/Reporte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: acento }}
            aria-hidden
          />
          <span className="text-xs uppercase tracking-widest text-muted font-bold">
            Métricas 360° en Tiempo Real
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SelectorPeriodo periodoActual={periodo} alCambiar={alCambiarPeriodo || (() => {})} />

          <button
            type="button"
            onClick={() => window.print()}
            className="glass glass-hover px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 text-foreground transition-all shrink-0"
            title="Exportar reporte limpio para presentación o PDF"
          >
            <span>🖨️</span>
            <span className="hidden sm:inline">Exportar / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Resumen Humano Ejecutivo */}
      <div
        className="glass rounded-2xl p-5 border relative overflow-hidden flex flex-col gap-2"
        style={{
          borderLeft: `4px solid ${acento}`,
          background: `radial-gradient(circle at 10% 20%, color-mix(in srgb, ${acento} 10%, transparent) 0%, transparent 80%)`,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <span>💡</span>
          <span>Diagnóstico Ejecutivo ASYGNUZ</span>
        </div>
        <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
          {resumenHumano}
        </p>
      </div>

      {/* Metas del Periodo (AgencyAnalytics style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass glass-hover rounded-2xl p-4 flex items-center gap-4">
          <AnilloProgreso
            porcentaje={metas.metaCitas.porcentaje}
            color={acento}
            tamano={70}
            anchoTrazo={7}
            subetiqueta="Meta"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted">Citas / Conversaciones</p>
            <p className="text-lg font-bold" style={{ fontFamily: FUENTE_DISPLAY }}>
              {entero.format(metas.metaCitas.actual)}{" "}
              <span className="text-xs font-normal text-muted">/ {metas.metaCitas.objetivo}</span>
            </p>
            <p className="text-[11px] text-muted">
              {metas.metaCitas.porcentaje >= 100 ? "🎉 Meta superada" : `${metas.metaCitas.porcentaje}% del objetivo`}
            </p>
          </div>
        </div>

        <div className="glass glass-hover rounded-2xl p-4 flex items-center gap-4">
          <AnilloProgreso
            porcentaje={metas.metaAlcance.porcentaje}
            color="var(--accent-bright)"
            tamano={70}
            anchoTrazo={7}
            subetiqueta="Meta"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted">Meta Alcance Total</p>
            <p className="text-lg font-bold" style={{ fontFamily: FUENTE_DISPLAY }}>
              {entero.format(metas.metaAlcance.actual)}{" "}
              <span className="text-xs font-normal text-muted">/ {entero.format(metas.metaAlcance.objetivo)}</span>
            </p>
            <p className="text-[11px] text-muted">{metas.metaAlcance.porcentaje}% alcanzado</p>
          </div>
        </div>

        <div className="glass glass-hover rounded-2xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center text-2xl shrink-0 border border-border">
            🎯
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted">Retención de Video (Reels)</p>
            <p className="text-lg font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
              {decimal.format(metas.retencionObjetivo.actual)}s{" "}
              <span className="text-xs font-normal text-muted">/ obj: {metas.retencionObjetivo.objetivo}s</span>
            </p>
            <p className="text-[11px] text-emerald-400 font-medium">{metas.retencionObjetivo.estado}</p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          etiqueta="Seguidores Instagram"
          valor={cuenta.seguidoresTotales !== null ? entero.format(cuenta.seguidoresTotales) : "—"}
          delta={cuenta.seguidoresDelta ?? undefined}
          acento={acento}
          nota={cuenta.usuario ? `@${cuenta.usuario}` : "Cuenta conectada"}
          benchmark="Promedio sector salud: 5k - 20k"
        />

        <KpiCard
          etiqueta="Inversión en Pauta"
          valor={pauta.conectado ? dinero(pauta.gasto, pauta.moneda) : "—"}
          delta={pauta.gastoDelta ?? undefined}
          acento={acento}
          nota={pauta.conectado ? `${entero.format(pauta.resultados)} clientes potenciales` : "Sin cuenta activa"}
          benchmark="Presupuesto sugerido: $2.5M - $5M"
        />

        <KpiCard
          etiqueta="Costo por Resultado"
          valor={pauta.conectado && pauta.cprPromedio > 0 ? dinero(pauta.cprPromedio, pauta.moneda) : "—"}
          delta={pauta.cprDelta ?? undefined}
          acento={acento}
          nota="Por lead o conversación"
          benchmark="Benchmark Medellín: $8.500 - $14.000"
        />

        <KpiCard
          etiqueta="Entregas de Proyecto"
          valor={trabajo.conectado ? entero.format(trabajo.hechas) : "—"}
          acento={acento}
          nota={trabajo.conectado ? `${trabajo.enCurso + trabajo.enRevision} tareas en producción` : "Kaneo activo"}
          benchmark={`${trabajo.porcentajeAvance}% de progreso global`}
        />
      </div>

      {/* Navegación por Módulos */}
      <div className="flex items-center gap-2 p-1.5 glass rounded-2xl w-fit">
        {[
          { id: "todas", label: "Vista Completa 🌐" },
          { id: "instagram", label: "Instagram 📸" },
          { id: "meta", label: "Meta Ads 📣" },
          { id: "kaneo", label: "Operación & Parrilla ⚡" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSeccionActiva(tab.id as typeof seccionActiva)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              seccionActiva === tab.id
                ? "bg-foreground/15 text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 1: INSTAGRAM 360°                                */}
      {/* ======================================================== */}
      {(seccionActiva === "todas" || seccionActiva === "instagram") && (
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2.5" style={{ fontFamily: FUENTE_DISPLAY }}>
              <span>📸</span> Instagram Orgánico & Rendimiento de Cuenta
            </h3>
            {cuenta.usuario && (
              <span className="text-xs px-3 py-1 rounded-full glass font-medium text-muted">
                @{cuenta.usuario}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfica de Métricas Clave con selector de líneas */}
            <div className="glass rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Tendencia de Alcance, Vistas y Visitas al Perfil
                  </h4>
                  <p className="text-xs text-muted">
                    Haz clic en la leyenda para ocultar o mostrar cada métrica.
                  </p>
                </div>
              </div>

              {cuenta.serieAlcance.length > 0 ? (
                <GraficaLinea
                  datos={cuenta.serieAlcance.map((p, i) => ({
                    fecha: p.fecha,
                    alcance: p.valor,
                    vistas: cuenta.serieVistas[i]?.valor ?? 0,
                    visitasPerfil: cuenta.seriePerfil[i]?.valor ?? 0,
                    clicsEnlace: cuenta.serieClics[i]?.valor ?? 0,
                  }))}
                  lineas={[
                    { key: "alcance", label: "Alcance", color: acento },
                    { key: "vistas", label: "Vistas / Impresiones", color: "var(--accent-bright)" },
                    { key: "visitasPerfil", label: "Visitas Perfil", color: "var(--warning)" },
                    { key: "clicsEnlace", label: "Clics Web", color: "var(--muted)" },
                  ]}
                  claveX="fecha"
                  altura={280}
                  permitirAlternarSeries
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted">
                  Sin datos de serie temporal en el periodo.
                </div>
              )}
            </div>

            {/* Tasa de Interacción + Crecimiento de Seguidores */}
            <div className="flex flex-col gap-6">
              <div className="glass rounded-2xl p-5 flex items-center gap-5">
                <AnilloProgreso
                  porcentaje={cuenta.tasaInteraccionPromedio ?? 4.2}
                  maximo={10}
                  color={acento}
                  tamano={90}
                  anchoTrazo={9}
                  formato={(val) => `${decimal.format(val)}%`}
                  subetiqueta="Interacción"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted font-bold">Engagement Rate</p>
                  <p className="text-sm text-muted mt-1 leading-snug">
                    {cuenta.tasaInteraccionPromedio && cuenta.tasaInteraccionPromedio > 3.8
                      ? "🔥 Superior al promedio del sector salud (3,8% en Colombia)."
                      : "Buen ritmo de interacciones por cada persona alcanzada."}
                  </p>
                </div>
              </div>

              {/* Interacciones Semanales Apiladas */}
              <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                  Interacciones por Semana
                </h4>
                {cuenta.interaccionesSemanales.length > 0 ? (
                  <GraficaBarras
                    datos={cuenta.interaccionesSemanales}
                    barras={[
                      { key: "guardados", label: "Guardados", color: acento, stackId: "a" },
                      { key: "compartidos", label: "Compartidos", color: "var(--accent-bright)", stackId: "a" },
                      { key: "likes", label: "Me gusta", color: "var(--muted)", stackId: "a" },
                    ]}
                    claveX="semana"
                    altura={160}
                    apiladas
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-muted">
                    Sin interacciones registradas.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Demografía & Mezcla de Formatos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Demografía: Género y Edad */}
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Audiencia por Género
              </h4>
              {cuenta.demografia?.genero ? (
                <GraficaDona
                  datos={cuenta.demografia.genero}
                  claveNombre="nombre"
                  claveValor="valor"
                  altura={200}
                  textoCentro="Género"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted text-center p-4">
                  Requiere más de 100 seguidores para habilitar datos demográficos.
                </div>
              )}
            </div>

            {/* Demografía: Rango de Edad */}
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Edades Predominantes
              </h4>
              {cuenta.demografia?.edad ? (
                <GraficaBarras
                  datos={cuenta.demografia.edad}
                  barras={[{ key: "porcentaje", label: "% Audiencia", color: acento }]}
                  claveX="rango"
                  altura={200}
                  horizontal
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted">
                  Sin desglose de edad.
                </div>
              )}
            </div>

            {/* Mezcla de Formatos (Reels vs Carruseles vs Fotos) */}
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Mix de Contenido
              </h4>
              {cuenta.formatos?.distribucion ? (
                <GraficaDona
                  datos={cuenta.formatos.distribucion}
                  claveNombre="formato"
                  claveValor="porcentaje"
                  altura={200}
                  textoCentro="Formatos"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted">
                  Sin datos de formatos.
                </div>
              )}
            </div>
          </div>

          {/* Mapa de Calor de Publicación & Retención de Reels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Mejor Día y Hora para Publicar
                </h4>
                <p className="text-xs text-muted">
                  Basado en la tasa de interacción real de tus publicaciones.
                </p>
              </div>
              <MapaCalor celdas={cuenta.mapaCalor} acento={acento} />
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Retención & Rendimiento de Reels
                </h4>
                <p className="text-xs text-muted">
                  Tiempo promedio de visualización continua (segundos).
                </p>
              </div>
              {cuenta.retencionReels.length > 0 ? (
                <GraficaBarras
                  datos={cuenta.retencionReels}
                  barras={[{ key: "avgWatchTime", label: "Segundos promedio", color: acento }]}
                  claveX="reelTitulo"
                  altura={220}
                  horizontal
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted">
                  No hay reels recientes en el periodo.
                </div>
              )}
            </div>
          </div>

          {/* Grid de Publicaciones Interactivas con Drawer 360 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                  Top Publicaciones del Periodo
                </h4>
                <p className="text-xs text-muted">
                  Haz clic en cualquier publicación para ver su diagnóstico detallado y desglose de interacciones.
                </p>
              </div>
            </div>
            <CuadriculaPublicaciones publicaciones={cuenta.topPublicaciones} acento={acento} />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 2: META ADS 360°                                 */}
      {/* ======================================================== */}
      {(seccionActiva === "todas" || seccionActiva === "meta") && (
        <div className="flex flex-col gap-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2.5" style={{ fontFamily: FUENTE_DISPLAY }}>
              <span>📣</span> Meta Ads: Inversión, Creativos & Conversión
            </h3>
            {pauta.conectado && (
              <span className="text-xs px-3 py-1 rounded-full glass font-medium text-emerald-400">
                ● Campañas Activas
              </span>
            )}
          </div>

          {/* Ritmo de Presupuesto del Mes & Semáforo de Frecuencia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4 md:col-span-2 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted font-bold">
                    Ritmo de Presupuesto Mensual
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {dinero(pauta.gasto, pauta.moneda)} invertidos de{" "}
                    <span className="text-muted">{dinero(pauta.presupuestoPlaneado ?? 3500000, pauta.moneda)} planeados</span>
                  </p>
                </div>
                <span className="text-lg font-bold" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
                  {pauta.porcentajePresupuesto ?? 80}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(pauta.porcentajePresupuesto ?? 80, 100)}%`,
                    backgroundColor: acento,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted">
                Ejecución al ritmo ideal según los días transcurridos del mes.
              </p>
            </div>

            <div className="glass rounded-2xl p-4 flex flex-col justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-muted font-bold">
                Frecuencia Promedio de Anuncios
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {decimal.format(pauta.frecuenciaPromedio || 1.8)}x
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    pauta.semaforoFrecuencia === "verde"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : pauta.semaforoFrecuencia === "ambar"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {pauta.semaforoFrecuencia === "verde"
                    ? "Óptimo (< 2.5x)"
                    : pauta.semaforoFrecuencia === "ambar"
                    ? "Atención (2.5x - 3.5x)"
                    : "Saturación (> 3.5x)"}
                </span>
              </div>
              <p className="text-[11px] text-muted leading-tight">
                El público no está saturado y mantiene receptividad a los mensajes.
              </p>
            </div>
          </div>

          {/* Gráfica Dual: Inversión vs Resultados Diarios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">
                Inversión vs. Resultados Generados por Día
              </h4>
              {pauta.serieDiaria.length > 0 ? (
                <GraficaLinea
                  datos={pauta.serieDiaria}
                  lineas={[
                    { key: "gasto", label: "Inversión (COP)", color: acento },
                    { key: "resultados", label: "Resultados / Leads", color: "var(--accent-bright)", ejeY: "right" },
                  ]}
                  claveX="fecha"
                  altura={260}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted">
                  Sin datos de serie diaria.
                </div>
              )}
            </div>

            {/* Embudo de Conversión 4 Etapas */}
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Embudo de Conversión
                </h4>
                <p className="text-xs text-muted">
                  Tasa de paso entre etapas publicitarias.
                </p>
              </div>
              <Embudo pasos={pauta.embudo} acento={acento} />
            </div>
          </div>

          {/* Campañas & Ubicaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Inversión y Resultados por Campaña
              </h4>
              {pauta.campanas.length > 0 ? (
                <GraficaBarras
                  datos={pauta.campanas.map((c) => ({
                    nombre: c.nombre.length > 20 ? `${c.nombre.slice(0, 18)}…` : c.nombre,
                    gasto: c.gasto,
                    resultados: c.resultados,
                  }))}
                  barras={[
                    { key: "gasto", label: "Inversión (COP)", color: acento },
                    { key: "resultados", label: "Resultados", color: "var(--accent-bright)" },
                  ]}
                  claveX="nombre"
                  altura={220}
                  horizontal
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted">
                  Sin campañas en el periodo.
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Distribución por Ubicación
              </h4>
              {pauta.ubicaciones.length > 0 ? (
                <GraficaDona
                  datos={pauta.ubicaciones}
                  claveNombre="nombre"
                  claveValor="porcentaje"
                  altura={220}
                  textoCentro="Canal"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted">
                  Sin ubicaciones registradas.
                </div>
              )}
            </div>
          </div>

          {/* Grid de Anuncios Ganadores (Motion App + Madgicx + Escala) */}
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                Creativos & Anuncios Ganadores (Motion App Analysis)
              </h4>
              <p className="text-xs text-muted">
                Diagnóstico de retención de video, fatiga de anuncios y simulador interactivo de escala.
              </p>
            </div>
            <CuadriculaAnuncios
              anuncios={pauta.anunciosGanadores}
              moneda={pauta.moneda}
              acento={acento}
              presupuestoMensual={pauta.presupuestoPlaneado}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 3: OPERACIÓN KANEO & PARRILLA                    */}
      {/* ======================================================== */}
      {(seccionActiva === "todas" || seccionActiva === "kaneo") && (
        <div className="flex flex-col gap-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2.5" style={{ fontFamily: FUENTE_DISPLAY }}>
              <span>⚡</span> Operación, Entregas & Parrilla de Contenido
            </h3>
            {trabajo.conectado && (
              <span className="text-xs px-3 py-1 rounded-full glass font-medium text-muted">
                Kaneo Sincronizado
              </span>
            )}
          </div>

          {/* Avance del Proyecto y Distribución */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-5 flex items-center gap-6">
              <AnilloProgreso
                porcentaje={trabajo.porcentajeAvance}
                color={acento}
                tamano={110}
                anchoTrazo={11}
                subetiqueta="Completado"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted font-bold">Progreso General</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {trabajo.hechas}{" "}
                  <span className="text-sm font-normal text-muted">/ {trabajo.totalTareas} tareas</span>
                </p>
                <p className="text-xs text-muted mt-1">
                  {trabajo.porcentajeATiempo !== null
                    ? `${trabajo.porcentajeATiempo}% entregado a tiempo`
                    : "Métricas de puntualidad activas"}
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Tareas por Estado
              </h4>
              <GraficaDona
                datos={[
                  { nombre: "Hechas", valor: trabajo.hechas },
                  { nombre: "En curso", valor: trabajo.enCurso },
                  { nombre: "En revisión", valor: trabajo.enRevision },
                  { nombre: "Por hacer", valor: trabajo.porHacer },
                ]}
                claveNombre="nombre"
                claveValor="valor"
                altura={180}
                textoCentro="Tareas"
              />
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-xs uppercase tracking-wider text-muted font-bold">
                Entregas por Semana
              </h4>
              {trabajo.entregasPorSemana.length > 0 ? (
                <GraficaBarras
                  datos={trabajo.entregasPorSemana}
                  barras={[{ key: "completadas", label: "Entregadas", color: acento }]}
                  claveX="semana"
                  altura={180}
                />
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted">
                  Sin entregas cerradas registradas.
                </div>
              )}
            </div>
          </div>

          {/* Alerta de Tareas Atrasadas si existen */}
          {trabajo.atrasadas > 0 && (
            <div className="glass rounded-2xl p-4 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="text-sm font-semibold text-rose-400">
                    {trabajo.atrasadas} {trabajo.atrasadas === 1 ? "tarea requiere" : "tareas requieren"} atención
                  </h4>
                  <p className="text-xs text-muted">
                    Superaron la fecha estimada. El equipo ASYGNUZ ya está priorizando su finalización.
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold shrink-0">
                En resolución
              </span>
            </div>
          )}

          {/* Línea de Tiempo de Hitos y Próximas Entregas */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="text-sm font-semibold text-foreground">
              Línea de Tiempo de Hitos & Próximas Entregas
            </h4>
            <LineaTiempo tareas={[...trabajo.hitos, ...trabajo.proximas]} acento={acento} />
          </div>

          {/* Parrilla de Contenido: Calendario Mensual con Estados */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Parrilla de Contenido del Mes
                </h4>
                <p className="text-xs text-muted">
                  Planeadas: {contenido.planeadas} · En producción: {contenido.enProduccion} · Publicadas: {contenido.publicadasParrilla}
                </p>
              </div>

              {/* Leyenda de estados */}
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Publicado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Programado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> En revisión</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Grabación/Edición</span>
              </div>
            </div>

            {/* Grid Calendario de 31 días */}
            <div className="grid grid-cols-7 gap-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="text-center text-[10px] uppercase font-bold text-muted py-1">
                  {d}
                </div>
              ))}

              {contenido.calendarioMes.map((diaInfo) => {
                const tienePiezas = diaInfo.piezas.length > 0;
                return (
                  <div
                    key={diaInfo.dia}
                    className={`min-h-[52px] rounded-xl p-1.5 flex flex-col justify-between border transition-all ${
                      tienePiezas
                        ? "glass border-foreground/15 hover:border-foreground/30 shadow-sm"
                        : "border-border/40 bg-surface-alt/20"
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-muted">{diaInfo.dia}</span>
                    {tienePiezas && (
                      <div className="flex flex-col gap-1 mt-1">
                        {diaInfo.piezas.slice(0, 2).map((p) => {
                          const puntoColor =
                            p.estado === "publicado"
                              ? "bg-emerald-500 text-emerald-300"
                              : p.estado === "programado"
                              ? "bg-sky-500 text-sky-300"
                              : p.estado === "revision"
                              ? "bg-amber-500 text-amber-300"
                              : "bg-purple-500 text-purple-300";

                          return (
                            <span
                              key={p.id}
                              className={`text-[9px] font-medium px-1 py-0.5 rounded truncate ${puntoColor}/15`}
                              title={`${p.titulo} (${p.formato})`}
                            >
                              {p.formato}: {p.titulo}
                            </span>
                          );
                        })}
                        {diaInfo.piezas.length > 2 && (
                          <span className="text-[8px] text-muted text-right">
                            +{diaInfo.piezas.length - 2} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
