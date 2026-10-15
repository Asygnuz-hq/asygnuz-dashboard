"use client";

import { useState, useEffect, useRef } from "react";
import type { IgConversacion, IgMensaje } from "@/lib/bandeja/tipos";
import { formatearHoraAmigable } from "@/lib/bandeja/texto";

interface ChatConversacionProps {
  conversacion: IgConversacion;
  mensajes: IgMensaje[];
  onEnviarMensaje: (texto: string) => Promise<boolean>;
  onCambiarEstado: (estado: "pendiente" | "respondida" | "archivada") => Promise<void>;
  loadingMensajes?: boolean;
}

export function ChatConversacion({
  conversacion,
  mensajes,
  onEnviarMensaje,
  onCambiarEstado,
  loadingMensajes = false,
}: ChatConversacionProps) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const finMensajesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    finMensajesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!texto.trim() || enviando || conversacion.vencida) return;

    setEnviando(true);
    setErrorEnvio(null);

    const ok = await onEnviarMensaje(texto.trim());
    if (ok) {
      setTexto("");
    } else {
      setErrorEnvio("Error al enviar el mensaje. Revisa los permisos o intenta nuevamente.");
    }
    setEnviando(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  }

  return (
    <div className="flex flex-col h-full glass rounded-2xl border border-border overflow-hidden">
      {/* Cabecera del chat */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/30 to-purple-500/30 border border-border flex items-center justify-center text-sm font-bold text-foreground shrink-0">
            {conversacion.ig_usuario_nombre ? conversacion.ig_usuario_nombre.slice(0, 2).toUpperCase() : "IG"}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">
              @{conversacion.ig_usuario_nombre ?? "usuario_instagram"}
            </h3>
            <p className="text-xs text-muted truncate">
              {conversacion.cliente_nombre ? `Cuenta: ${conversacion.cliente_nombre}` : "Instagram Direct"}
            </p>
          </div>
        </div>

        {/* Acciones de estado y badge de ventana */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {conversacion.canal_respuesta === "respuesta_privada" ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              🔒 Respuesta privada a comentario (1 en 7d)
            </span>
          ) : conversacion.canal_respuesta === "solo_publica" ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              🚫 Solo pública (DM en frío bloqueado)
            </span>
          ) : conversacion.vencida ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              🚫 Ventana 24h vencida
            </span>
          ) : (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                conversacion.horas_restantes <= 3
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              }`}
            >
              ⏱️ {conversacion.horas_restantes === 0 ? `${conversacion.minutos_restantes} min` : `${conversacion.horas_restantes} h`} para responder
            </span>
          )}

          <div className="flex items-center gap-1 border-l border-border pl-2">
            {conversacion.estado !== "respondida" && (
              <button
                type="button"
                onClick={() => onCambiarEstado("respondida")}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-alt hover:bg-foreground/15 border border-border text-foreground transition-all"
                title="Marcar como respondida"
              >
                ✅ Lista
              </button>
            )}
            {conversacion.estado !== "archivada" ? (
              <button
                type="button"
                onClick={() => onCambiarEstado("archivada")}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-alt hover:bg-foreground/15 border border-border text-muted hover:text-foreground transition-all"
                title="Archivar conversación"
              >
                🗄️ Archivar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCambiarEstado("pendiente")}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-alt hover:bg-foreground/15 border border-border text-muted hover:text-foreground transition-all"
                title="Desarchivar"
              >
                ↩️ Reabrir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Guía de Marca (colapsable/referencia) */}
      {conversacion.guia_marca && (
        <div className="px-4 py-2 bg-foreground/5 border-b border-border/50 text-[11px] text-muted flex items-center justify-between">
          <span className="truncate">
            💡 <strong>Guía de marca:</strong> {conversacion.guia_marca}
          </span>
        </div>
      )}

      {/* Flujo de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loadingMensajes ? (
          <div className="m-auto text-xs text-muted">Cargando mensajes...</div>
        ) : mensajes.length === 0 ? (
          <div className="m-auto text-center text-xs text-muted p-6">
            <span className="text-3xl mb-2 block">💬</span>
            <p className="font-semibold text-foreground">Sin historial previo registrado</p>
            <p className="text-[11px] mt-1">Los mensajes enviados y recibidos aparecerán aquí en tiempo real.</p>
          </div>
        ) : (
          mensajes.map((m) => {
            const esMio = m.remitente === "cuenta";
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${
                  esMio ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                    esMio
                      ? "bg-foreground/15 text-foreground rounded-tr-xs border border-foreground/15"
                      : "bg-surface-alt text-foreground rounded-tl-xs border border-border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </div>

                {/* Metadatos del mensaje */}
                <div className="flex items-center gap-1.5 text-[10px] text-muted mt-1 px-1">
                  {esMio && m.enviado_por && (
                    <span
                      className={`font-semibold ${
                        m.enviado_por === "n8n"
                          ? "text-purple-400"
                          : m.enviado_por === "claude"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {m.enviado_por === "n8n"
                        ? "⚡ Automático"
                        : m.enviado_por === "claude"
                        ? "🤖 Claude"
                        : "👤 Manual"}
                    </span>
                  )}
                  <span>·</span>
                  <span>{formatearHoraAmigable(m.creado_en)}</span>
                  {m.estado_envio === "fallido" && (
                    <span className="text-red-400 font-bold">⚠️ Error</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={finMensajesRef} />
      </div>

      {/* Banner según canal permitido */}
      {conversacion.canal_respuesta === "solo_publica" ? (
        <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <span className="text-base shrink-0">⚠️</span>
          <p className="text-[11px] leading-tight">
            <strong>Riesgo de bloqueo (DM en frío prevenido):</strong> Esta persona comentó pero nunca escribió por DM. Meta solo permite una respuesta privada al comentario (ya usada o expirada). Solo se admiten respuestas públicas.
          </p>
        </div>
      ) : conversacion.canal_respuesta === "respuesta_privada" ? (
        <div className="p-3 bg-blue-500/10 border-t border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
          <span className="text-base shrink-0">ℹ️</span>
          <p className="text-[11px] leading-tight">
            <strong>Respuesta privada única:</strong> Tu mensaje se enviará como respuesta privada al comentario de origen en Instagram (1 permitida dentro de 7 días).
          </p>
        </div>
      ) : conversacion.vencida ? (
        <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <span className="text-base shrink-0">⚠️</span>
          <p className="text-[11px] leading-tight">
            <strong>Ventana de 24 horas vencida:</strong> Según las normas de Meta para evitar bloqueos,
            no es posible enviar nuevos mensajes hasta que el usuario te vuelva a escribir.
          </p>
        </div>
      ) : null}

      {/* Caja para responder */}
      <div className="p-3 border-t border-border bg-surface/40">
        {errorEnvio && (
          <p className="text-[11px] text-red-400 mb-2 font-medium">{errorEnvio}</p>
        )}
        <form onSubmit={handleEnviar} className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={
                conversacion.canal_respuesta === "solo_publica" ||
                (conversacion.canal_respuesta !== "respuesta_privada" && conversacion.vencida) ||
                enviando
              }
              placeholder={
                conversacion.canal_respuesta === "solo_publica"
                  ? "Contacto privado no permitido por Meta para este comentario..."
                  : conversacion.canal_respuesta === "respuesta_privada"
                  ? "Escribe la respuesta privada única al comentario..."
                  : conversacion.vencida
                  ? "Ventana vencida. Espera un nuevo mensaje del usuario..."
                  : "Escribe tu respuesta (Enter para enviar, Shift+Enter para salto de línea)..."
              }
              rows={2}
              maxLength={1000}
              className="w-full p-3 pr-20 text-xs rounded-xl bg-surface-alt border border-border focus:outline-none focus:border-foreground/30 text-foreground placeholder:text-muted resize-none disabled:opacity-50"
            />
            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
              <span className="text-[10px] text-muted">{texto.length}/1000</span>
              <button
                type="submit"
                disabled={
                  !texto.trim() ||
                  enviando ||
                  conversacion.canal_respuesta === "solo_publica" ||
                  (conversacion.canal_respuesta !== "respuesta_privada" && conversacion.vencida)
                }
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {enviando ? "Enviando..." : "Enviar 🚀"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
