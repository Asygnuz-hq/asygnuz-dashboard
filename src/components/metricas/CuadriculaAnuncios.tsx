"use client";

import { useState } from "react";
import type { AnuncioGanador } from "@/lib/portal/avanceTipos";
import { DrawerDetalle } from "./DrawerDetalle";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

interface CuadriculaAnunciosProps {
  anuncios: AnuncioGanador[];
  moneda?: string | null;
  acento?: string;
  presupuestoMensual?: number | null;
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

export function CuadriculaAnuncios({
  anuncios,
  moneda = "COP",
  acento = "var(--success)",
  presupuestoMensual = 3500000,
}: CuadriculaAnunciosProps) {
  const [anuncioSeleccionado, setAnuncioSeleccionado] = useState<AnuncioGanador | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // Simulador de escala interactivo (Motion App / Madgicx style)
  const [inversionSimulada, setInversionSimulada] = useState<number>(presupuestoMensual || 3500000);

  const anunciosFiltrados = anuncios.filter((ad) => {
    if (filtroEstado !== "TODOS" && ad.estado !== filtroEstado) return false;
    if (busqueda.trim() && !ad.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !ad.campana.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Cálculo de proyección de escala basado en el CPR del mejor anuncio o promedio
  const cprReferencia = anuncios.length > 0 ? anuncios[0].cpr : 15000;
  const resultadosProyectados = Math.round(inversionSimulada / (cprReferencia || 1));
  const alcanceProyectado = Math.round(inversionSimulada * 0.08); // aprox 80 personas por cada $1.000 COP

  if (anuncios.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 border border-border text-center">
        <p className="text-sm font-semibold text-foreground">Aún no se registran anuncios activos en este periodo</p>
        <p className="text-xs text-muted mt-1 max-w-md mx-auto">
          Cuando las campañas de Meta Ads comiencen a difundir creativos, verás aquí el desglose de anuncios ganadores, métricas de retención de video (Hook y Hold Rate) y el simulador de escala.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controles de filtro y búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 glass rounded-xl w-fit">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "WINNER", label: "Ganadores 🏆" },
            { id: "TESTING", label: "En prueba 🧪" },
            { id: "FATIGUE", label: "Fatigados ⚠️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroEstado === tab.id
                  ? "bg-foreground/10 text-foreground font-semibold shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar anuncio o campaña…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="glass px-3.5 py-1.5 rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 w-full sm:w-64"
        />
      </div>

      {/* Grid de Anuncios */}
      {anunciosFiltrados.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
          No se encontraron anuncios con el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anunciosFiltrados.map((ad) => {
            const badgeColor =
              ad.estado === "WINNER"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : ad.estado === "FATIGUE"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30";

            return (
              <div
                key={ad.id}
                onClick={() => setAnuncioSeleccionado(ad)}
                className="glass glass-hover rounded-2xl p-4 flex flex-col gap-3 cursor-pointer group transition-all"
              >
                {/* Header tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {ad.estadoTexto}
                  </span>
                  <span className="text-[11px] text-muted truncate max-w-[150px]">{ad.campana}</span>
                </div>

                <div className="flex gap-3">
                  {/* Thumbnail / Creativo */}
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-surface-alt shrink-0 flex items-center justify-center border border-border">
                    {ad.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.imagenUrl} alt={ad.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-2xl opacity-60">🎬</span>
                    )}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-foreground/80">
                        {ad.nombre}
                      </h4>
                      <p className="text-[11px] text-muted mt-1">
                        Inversión: <span className="font-medium text-foreground">{dinero(ad.inversion, moneda)}</span>
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border">
                      <div>
                        <p className="text-[10px] uppercase text-muted">Resultados</p>
                        <p className="text-sm font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                          {entero.format(ad.resultados)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-muted">CPR</p>
                        <p className="text-sm font-semibold" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
                          {dinero(ad.cpr, moneda)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métricas avanzadas Motion App: Hook Rate y Hold Rate */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border bg-surface-alt/40 -mx-4 -mb-4 p-3 rounded-b-2xl">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Hook Rate (3s)</span>
                      <span className="font-semibold text-foreground">{decimal.format(ad.hookRate)}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(ad.hookRate, 100)}%`,
                          backgroundColor: ad.hookRate > 30 ? "var(--success)" : "var(--warning)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Hold Rate (Ret.)</span>
                      <span className="font-semibold text-foreground">{decimal.format(ad.holdRate)}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(ad.holdRate, 100)}%`,
                          backgroundColor: ad.holdRate > 15 ? "var(--success)" : "var(--muted)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simulador Interactivo de Escala Presupuestal (Growth Forecast) */}
      <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: FUENTE_DISPLAY }}>
              <span>🚀</span> Simulador de Escala & Proyección de Crecimiento
            </h4>
            <p className="text-xs text-muted">
              Ajusta la inversión mensual proyectada para calcular el impacto estimado en clientes potenciales.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-surface-alt font-medium text-foreground w-fit">
            CPR de referencia: {dinero(cprReferencia, moneda)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted">Inversión mensual simulada:</span>
            <span className="text-lg font-bold" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
              {dinero(inversionSimulada, moneda)}
            </span>
          </div>
          <input
            type="range"
            min={1000000}
            max={15000000}
            step={250000}
            value={inversionSimulada}
            onChange={(e) => setInversionSimulada(Number(e.target.value))}
            className="w-full accent-[var(--accent-bright)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>$1.000.000</span>
            <span>$7.500.000</span>
            <span>$15.000.000 COP</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
          <div className="glass rounded-xl p-3">
            <p className="text-[10px] uppercase text-muted">Alcance estimado</p>
            <p className="text-base font-semibold mt-0.5" style={{ fontFamily: FUENTE_DISPLAY }}>
              ~{entero.format(alcanceProyectado)}
            </p>
            <p className="text-[10px] text-muted">Personas únicas</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-[10px] uppercase text-muted">Resultados previstos</p>
            <p className="text-base font-semibold mt-0.5" style={{ fontFamily: FUENTE_DISPLAY, color: "var(--success)" }}>
              ~{entero.format(resultadosProyectados)}
            </p>
            <p className="text-[10px] text-muted">Leads / Conversaciones</p>
          </div>
          <div className="glass rounded-xl p-3 col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase text-muted">Recomendación ASYGNUZ</p>
            <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
              {inversionSimulada > 5000000
                ? "Duplicar anuncios ganadores y expandir a audiencias Advantage+."
                : "Consolidar creativos con Hook Rate > 30% antes de subir presupuesto."}
            </p>
          </div>
        </div>
      </div>

      {/* Drawer 360° de Detalle del Anuncio */}
      <DrawerDetalle
        abierto={Boolean(anuncioSeleccionado)}
        alCerrar={() => setAnuncioSeleccionado(null)}
        titulo="Diagnóstico 360° del Anuncio"
      >
        {anuncioSeleccionado && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4 items-start">
              <div className="w-24 h-32 rounded-xl overflow-hidden bg-surface-alt shrink-0 border border-border flex items-center justify-center">
                {anuncioSeleccionado.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={anuncioSeleccionado.imagenUrl} alt={anuncioSeleccionado.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl opacity-60">🎬</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-surface-alt">
                  {anuncioSeleccionado.estadoTexto}
                </span>
                <h3 className="text-base font-semibold mt-2 leading-snug">{anuncioSeleccionado.nombre}</h3>
                <p className="text-xs text-muted mt-1">Campaña: {anuncioSeleccionado.campana}</p>
                {anuncioSeleccionado.audiencia && (
                  <p className="text-xs text-muted">Audiencia: {anuncioSeleccionado.audiencia}</p>
                )}
              </div>
            </div>

            {/* Diagnóstico de Fatiga Madgicx */}
            <div className="glass rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold uppercase text-muted mb-1">Diagnóstico Madgicx</p>
              <p className="text-sm font-medium text-foreground">{anuncioSeleccionado.fatigaDiagnostico}</p>
              <div className="mt-2 text-xs text-muted flex items-center gap-2">
                <span>Frecuencia acumulada:</span>
                <span className="font-semibold text-foreground">{decimal.format(anuncioSeleccionado.frecuencia)}x</span>
                {anuncioSeleccionado.frecuencia >= 3.5 ? (
                  <span className="text-rose-400 font-medium">⚠️ Alta saturación</span>
                ) : (
                  <span className="text-emerald-400 font-medium">✅ Frecuencia saludable</span>
                )}
              </div>
            </div>

            {/* Métricas clave */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted">Inversión</p>
                <p className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {dinero(anuncioSeleccionado.inversion, moneda)}
                </p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted">Resultados</p>
                <p className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {entero.format(anuncioSeleccionado.resultados)}
                </p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted">Costo por Resultado</p>
                <p className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY, color: acento }}>
                  {dinero(anuncioSeleccionado.cpr, moneda)}
                </p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted">CTR (Tasa de clics)</p>
                <p className="text-base font-semibold" style={{ fontFamily: FUENTE_DISPLAY }}>
                  {decimal.format(anuncioSeleccionado.ctr)}%
                </p>
              </div>
            </div>

            {/* Análisis Motion App */}
            <div className="glass rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase text-muted">Métricas Creativas (Motion App)</p>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span>Thumbstop / Hook Rate (Primeros 3 seg)</span>
                  <span className="font-semibold">{decimal.format(anuncioSeleccionado.hookRate)}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(anuncioSeleccionado.hookRate, 100)}%`,
                      backgroundColor: anuncioSeleccionado.hookRate >= 30 ? "var(--success)" : "var(--warning)",
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  {anuncioSeleccionado.hookRate >= 30
                    ? "Excelente gancho: más del 30% del público frena el scroll en los primeros 3 segundos."
                    : "Gancho débil: sugerimos cambiar la miniatura y los primeros 3 segundos del video."}
                </p>
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-border">
                <div className="flex justify-between text-xs">
                  <span>Hold Rate (Retención sostenida)</span>
                  <span className="font-semibold">{decimal.format(anuncioSeleccionado.holdRate)}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(anuncioSeleccionado.holdRate, 100)}%`,
                      backgroundColor: anuncioSeleccionado.holdRate >= 15 ? "var(--success)" : "var(--muted)",
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  {anuncioSeleccionado.holdRate >= 15
                    ? "Alta retención: el mensaje mantiene al usuario atento hasta el llamado a la acción."
                    : "Pérdida de interés a mitad de video: recortar pausas y agilizar la edición."}
                </p>
              </div>
            </div>
          </div>
        )}
      </DrawerDetalle>
    </div>
  );
}
