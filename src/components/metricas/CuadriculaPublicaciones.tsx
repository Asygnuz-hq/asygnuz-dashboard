"use client";

import { useState, useMemo } from "react";
import type { PublicacionInstagram } from "@/lib/portal/avanceTipos";
import { DrawerDetalle } from "./DrawerDetalle";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export type CuadriculaPublicacionesProps = {
  publicaciones: PublicacionInstagram[];
  acento?: string;
};

export function CuadriculaPublicaciones({ publicaciones }: CuadriculaPublicacionesProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [criterioOrden, setCriterioOrden] = useState<string>("alcance");
  const [seleccionada, setSeleccionada] = useState<PublicacionInstagram | null>(null);

  const listaFiltrada = useMemo(() => {
    return publicaciones
      .filter((p) => {
        const pasaTipo = filtroTipo === "TODOS" || p.media_product_type === filtroTipo || p.media_type === filtroTipo;
        const pasaBusqueda = !busqueda || (p.caption && p.caption.toLowerCase().includes(busqueda.toLowerCase()));
        return pasaTipo && pasaBusqueda;
      })
      .sort((a, b) => {
        if (criterioOrden === "guardados") return b.saved - a.saved;
        if (criterioOrden === "interaccion") return b.tasaInteraccion - a.tasaInteraccion;
        return b.alcance - a.alcance;
      });
  }, [publicaciones, filtroTipo, busqueda, criterioOrden]);

  if (publicaciones.length === 0) {
    return <p className="text-sm text-muted">Aún no hay publicaciones en el periodo seleccionado.</p>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Barra de filtros y búsqueda */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {["TODOS", "REELS", "CAROUSEL_ALBUM", "IMAGE"].map((tipo) => {
            const activo = filtroTipo === tipo;
            const label = tipo === "TODOS" ? "Todas" : tipo === "REELS" ? "Reels" : tipo === "CAROUSEL_ALBUM" ? "Carruseles" : "Fotos";
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  activo
                    ? "bg-surface-alt text-foreground border-border"
                    : "text-muted hover:text-foreground border-transparent"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por tema..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="text-xs py-1 px-2.5 rounded-lg bg-surface-alt border border-border text-foreground w-40 sm:w-52"
          />
          <select
            value={criterioOrden}
            onChange={(e) => setCriterioOrden(e.target.value)}
            className="text-xs py-1 px-2 rounded-lg bg-surface-alt border border-border text-foreground"
          >
            <option value="alcance">Mayor Alcance</option>
            <option value="guardados">Más Guardados</option>
            <option value="interaccion">Mayor Interacción</option>
          </select>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {listaFiltrada.slice(0, 6).map((p) => (
          <div
            key={p.id}
            onClick={() => setSeleccionada(p)}
            className="glass glass-hover rounded-xl overflow-hidden cursor-pointer flex flex-col group border border-border"
          >
            <div className="relative aspect-square bg-surface-alt overflow-hidden">
              {p.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagenUrl}
                  alt={p.caption ?? "Publicación"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs">Sin vista previa</div>
              )}
              <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-[10px] text-white font-semibold uppercase px-2 py-0.5 rounded">
                {p.media_product_type || p.media_type}
              </span>
            </div>

            <div className="p-3 flex flex-col justify-between flex-1 gap-2">
              <p className="text-xs text-foreground line-clamp-2 leading-snug">{p.caption ?? "Sin texto"}</p>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted">
                <span>👁️ {p.alcance.toLocaleString("es-CO")}</span>
                <span>🔖 {p.saved}</span>
                <span className="text-success font-semibold">⚡ {p.tasaInteraccion}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer 360° de detalle de publicación */}
      <DrawerDetalle
        abierto={Boolean(seleccionada)}
        onCerrar={() => setSeleccionada(null)}
        titulo={`Auditoría de Publicación: ${seleccionada?.media_product_type || seleccionada?.media_type || ""}`}
      >
        {seleccionada && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {seleccionada.imagenUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seleccionada.imagenUrl}
                  alt="Miniatura"
                  className="w-24 h-24 object-cover rounded-xl border border-border shrink-0"
                />
              )}
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-accent-bright bg-accent-bright/10 border border-accent-bright/20 px-2 py-0.5 rounded-full">
                  {seleccionada.pilar ?? "Contenido"}
                </span>
                <p className="text-xs text-muted mt-1.5">
                  Publicado: {new Date(seleccionada.timestamp).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {seleccionada.permalink && (
                  <a
                    href={seleccionada.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-accent-bright hover:underline font-medium"
                  >
                    Ver en Instagram ↗
                  </a>
                )}
              </div>
            </div>

            <div className="glass rounded-xl p-3.5 text-xs leading-relaxed text-foreground whitespace-pre-line">
              {seleccionada.caption}
            </div>

            <div>
              <p className="text-xs font-bold text-foreground mb-2.5">Métricas de Engagement (Graph API v21)</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase text-muted font-semibold">Alcance Único</p>
                  <p className="text-lg font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
                    {seleccionada.alcance.toLocaleString("es-CO")}
                  </p>
                  <span className="text-[10px] text-muted">{seleccionada.impresiones.toLocaleString("es-CO")} vistas</span>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase text-muted font-semibold">Tasa de Interacción</p>
                  <p className="text-lg font-bold text-success" style={{ fontFamily: FUENTE_DISPLAY }}>
                    {seleccionada.tasaInteraccion}%
                  </p>
                  <span className="text-[10px] text-success">Sobresaliente</span>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase text-muted font-semibold">Guardados (Alta Intención)</p>
                  <p className="text-lg font-bold text-accent-bright" style={{ fontFamily: FUENTE_DISPLAY }}>
                    {seleccionada.saved}
                  </p>
                  <span className="text-[10px] text-muted">Pacientes potenciales</span>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase text-muted font-semibold">Compartidos</p>
                  <p className="text-lg font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
                    {seleccionada.shares}
                  </p>
                  <span className="text-[10px] text-muted">Viralidad orgánica</span>
                </div>
              </div>
            </div>

            {seleccionada.avgWatchTime && (
              <div className="glass rounded-xl p-3.5 border-l-4 border-l-accent-bright">
                <p className="text-xs font-bold text-foreground mb-1">⏱️ Retención de Video (Motion App Standard)</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-[10px] text-muted uppercase">Tiempo Promedio</span>
                    <p className="text-base font-bold text-foreground">{seleccionada.avgWatchTime}s</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase">Skip Rate (&lt;3s)</span>
                    <p className="text-base font-bold text-success">{seleccionada.skipRate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerDetalle>
    </div>
  );
}
