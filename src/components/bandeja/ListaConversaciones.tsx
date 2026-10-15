"use client";

import { useMemo } from "react";
import type { IgConversacion } from "@/lib/bandeja/tipos";
import { formatearHoraAmigable } from "@/lib/bandeja/texto";

interface ListaConversacionesProps {
  conversaciones: IgConversacion[];
  seleccionadaId: string | null;
  onSeleccionar: (conv: IgConversacion) => void;
  filtroEstado: string;
  setFiltroEstado: (estado: string) => void;
  filtroTipo: string;
  setFiltroTipo: (tipo: string) => void;
  busqueda: string;
  setBusqueda: (q: string) => void;
  loading?: boolean;
}

export function ListaConversaciones({
  conversaciones,
  seleccionadaId,
  onSeleccionar,
  filtroEstado,
  setFiltroEstado,
  filtroTipo,
  setFiltroTipo,
  busqueda,
  setBusqueda,
  loading = false,
}: ListaConversacionesProps) {
  const listaFiltrada = useMemo(() => {
    return conversaciones.filter((c) => {
      if (filtroEstado !== "todas" && c.estado !== filtroEstado) return false;
      if (filtroTipo !== "todos" && c.tipo_ultimo_evento !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const matchUser = c.ig_usuario_nombre?.toLowerCase().includes(q);
        const matchTexto = c.ultimo_mensaje_texto?.toLowerCase().includes(q);
        const matchCliente = c.cliente_nombre?.toLowerCase().includes(q);
        if (!matchUser && !matchTexto && !matchCliente) return false;
      }
      return true;
    });
  }, [conversaciones, filtroEstado, filtroTipo, busqueda]);

  const conteoPendientes = conversaciones.filter((c) => c.estado === "pendiente").length;

  return (
    <div className="flex flex-col h-full glass rounded-2xl border border-border overflow-hidden">
      {/* Cabecera y Filtros */}
      <div className="p-3.5 border-b border-border flex flex-col gap-2.5 bg-surface/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground">Conversaciones</span>
            {conteoPendientes > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {conteoPendientes} pendientes
              </span>
            )}
          </div>
          <span className="text-xs text-muted">{listaFiltrada.length} en total</span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por usuario, cliente o texto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border focus:outline-none focus:border-foreground/30 text-foreground placeholder:text-muted"
          />
          <span className="absolute left-2.5 top-2 text-xs text-muted">🔍</span>
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-1 p-1 bg-surface-alt/70 rounded-xl">
          {[
            { id: "pendiente", label: "Pendientes ⏳" },
            { id: "respondida", label: "Respondidas ✅" },
            { id: "archivada", label: "Archivadas 🗄️" },
            { id: "todas", label: "Todas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                filtroEstado === tab.id
                  ? "bg-foreground/15 text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtro por tipo: DMs vs Comentarios */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted text-[11px]">Tipo:</span>
          {[
            { id: "todos", label: "Todos" },
            { id: "message", label: "DMs 💬" },
            { id: "comment", label: "Comentarios 💬" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFiltroTipo(t.id)}
              className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                filtroTipo === t.id
                  ? "bg-foreground/20 text-foreground font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Cargando conversaciones...</div>
        ) : listaFiltrada.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📥</span>
            <p className="font-semibold text-foreground">No hay conversaciones</p>
            <p className="text-[11px]">No se encontraron mensajes con los filtros seleccionados.</p>
          </div>
        ) : (
          listaFiltrada.map((conv) => {
            const esSeleccionada = conv.id === seleccionadaId;
            return (
              <button
                key={conv.id}
                onClick={() => onSeleccionar(conv)}
                className={`w-full text-left p-3.5 transition-all flex flex-col gap-1.5 relative ${
                  esSeleccionada
                    ? "bg-foreground/10 border-l-4 border-l-emerald-400"
                    : "hover:bg-foreground/5 border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-surface-alt border border-border flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {conv.ig_usuario_nombre ? conv.ig_usuario_nombre.slice(0, 2).toUpperCase() : "IG"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        @{conv.ig_usuario_nombre ?? "usuario_instagram"}
                      </p>
                      <p className="text-[10px] text-muted truncate">
                        {conv.cliente_nombre ? `Cuenta: ${conv.cliente_nombre}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Badge de ventana de 24h */}
                  {conv.vencida ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                      24h vencida
                    </span>
                  ) : conv.horas_restantes <= 3 ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 animate-pulse">
                      {conv.horas_restantes === 0 ? `${conv.minutos_restantes}m` : `${conv.horas_restantes}h`} restantes
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {conv.horas_restantes}h restantes
                    </span>
                  )}
                </div>

                {/* Último mensaje */}
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {conv.ultimo_mensaje_texto ?? "Sin mensaje reciente"}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted pt-1">
                  <span className="flex items-center gap-1">
                    {conv.tipo_ultimo_evento === "comment" ? "💬 Comentario" : "✉️ Mensaje directo"}
                  </span>
                  <span>{formatearHoraAmigable(conv.ultimo_mensaje_usuario_en)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
