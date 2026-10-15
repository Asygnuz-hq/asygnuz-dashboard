"use client";

import type { IgFlujo } from "@/lib/bandeja/tipos";

interface DiagramaFlujoVisualProps {
  flujo: IgFlujo;
  onEditar?: () => void;
  onAlternarActivo?: (activo: boolean) => void;
  modoSoloLectura?: boolean;
}

export function DiagramaFlujoVisual({
  flujo,
  onEditar,
  onAlternarActivo,
  modoSoloLectura = false,
}: DiagramaFlujoVisualProps) {
  const totalClics = (flujo.links_tracking ?? []).reduce(
    (s: number, l) => s + (l.clics_count ?? 0),
    0
  );
  const disparados = flujo.total_disparado ?? 0;
  const respuestas = flujo.total_respuestas ?? 0;

  return (
    <div className="glass rounded-2xl border border-border p-5 flex flex-col gap-4 transition-all">
      {/* Cabecera del Flujo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-lg">
            ⚡
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              {flujo.nombre}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  flujo.activo
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-alt text-muted border border-border"
                }`}
              >
                {flujo.activo ? "● Activo" : "○ Pausado"}
              </span>
            </h4>
            <p className="text-xs text-muted">
              Palabras clave:{" "}
              <span className="font-semibold text-foreground">
                {flujo.palabras_clave.map((p) => `"${p}"`).join(", ")}
              </span>
            </p>
          </div>
        </div>

        {/* Acciones */}
        {!modoSoloLectura && (
          <div className="flex items-center gap-2">
            {onAlternarActivo && (
              <button
                type="button"
                onClick={() => onAlternarActivo(!flujo.activo)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  flujo.activo
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                {flujo.activo ? "Pausar" : "Activar"}
              </button>
            )}
            {onEditar && (
              <button
                type="button"
                onClick={onEditar}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-surface-alt hover:bg-foreground/15 border border-border text-foreground transition-all"
              >
                ✏️ Editar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Diagrama Horizontal tipo ManyChat */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="flex items-center gap-3 min-w-[760px]">
          {/* PASO 1: DISPARADOR */}
          <div className="flex-1 glass glass-hover rounded-xl p-3.5 border border-border flex flex-col gap-2 min-w-[170px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <span>💬</span> 1. Disparador
              </span>
              <span className="text-[11px] font-bold text-foreground px-1.5 py-0.5 rounded-md bg-surface-alt">
                {disparados}
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-1">
              Comentan {flujo.palabras_clave[0] ?? "PALABRA"}
            </p>
            <p className="text-[11px] text-muted line-clamp-2">
              {flujo.aplica_a === "todas" ? "En cualquier post o reel" : `En publicación específica`}
            </p>
          </div>

          {/* Flecha conectora */}
          <div className="text-muted text-xs font-bold shrink-0 select-none">──▶</div>

          {/* PASO 2: RESPUESTA PÚBLICA */}
          <div className="flex-1 glass glass-hover rounded-xl p-3.5 border border-border flex flex-col gap-2 min-w-[170px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <span>📣</span> 2. Resp. Pública
              </span>
              <span className="text-[11px] font-bold text-foreground px-1.5 py-0.5 rounded-md bg-surface-alt">
                {respuestas}
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-1">
              Comentario público
            </p>
            <p className="text-[11px] text-muted italic line-clamp-2">
              &ldquo;{flujo.respuesta_publica[0] ?? "¡Te escribimos por DM con toda la info! 🙌"}&rdquo;
            </p>
          </div>

          {/* Flecha conectora */}
          <div className="text-muted text-xs font-bold shrink-0 select-none">──▶</div>

          {/* PASO 3: DM PRIVADO */}
          <div className="flex-1 glass glass-hover rounded-xl p-3.5 border border-border flex flex-col gap-2 min-w-[170px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <span>✉️</span> 3. DM Privado
              </span>
              <span className="text-[11px] font-bold text-foreground px-1.5 py-0.5 rounded-md bg-surface-alt">
                {respuestas}
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-1">
              Mensaje Directo
            </p>
            <p className="text-[11px] text-muted line-clamp-2">
              {flujo.respuesta_privada}
            </p>
          </div>

          {/* Flecha conectora */}
          <div className="text-muted text-xs font-bold shrink-0 select-none">──▶</div>

          {/* PASO 4: BOTÓN Y REDIRECCIÓN */}
          <div className="flex-1 glass glass-hover rounded-xl p-3.5 border border-border flex flex-col gap-2 min-w-[170px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <span>🔗</span> 4. Link & Clics
              </span>
              <span className="text-[11px] font-bold text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/10">
                {totalClics} clics
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-1">
              {flujo.botones.length > 0 ? flujo.botones[0].titulo : "Enlace rastreado"}
            </p>
            <p className="text-[11px] text-muted truncate">
              {flujo.botones.length > 0 ? flujo.botones[0].url : "Sin link"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
