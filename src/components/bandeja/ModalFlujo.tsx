"use client";

import { useState } from "react";
import type { IgFlujo, BotonFlujo } from "@/lib/bandeja/tipos";

interface ModalFlujoProps {
  flujo?: IgFlujo | null;
  conexionId: string;
  tenantId?: string | null;
  instagramUsername?: string | null;
  onGuardar: (datos: {
    id?: string;
    nombre: string;
    conexion_id: string;
    tenant_id?: string | null;
    palabras_clave: string[];
    aplica_a: string;
    respuesta_privada: string;
    respuesta_publica: string[];
    botones: BotonFlujo[];
    activo: boolean;
  }) => Promise<void>;
  onCerrar: () => void;
}

export function ModalFlujo({
  flujo,
  conexionId,
  tenantId,
  instagramUsername,
  onGuardar,
  onCerrar,
}: ModalFlujoProps) {
  const [nombre, setNombre] = useState(flujo?.nombre ?? "");
  const [palabrasClaveTexto, setPalabrasClaveTexto] = useState(
    flujo?.palabras_clave.join(", ") ?? "PRECIO, INFO, CITA"
  );
  const [aplicaA, setAplicaA] = useState(flujo?.aplica_a ?? "todas");
  const [respuestaPrivada, setRespuestaPrivada] = useState(
    flujo?.respuesta_privada ??
      "¡Hola! Te compartimos el detalle completo de nuestro tratamiento y los valores actuales. Si deseas agendar tu valoración presencial o virtual, haz clic en el botón de abajo 👇"
  );
  const [respuestasPublicasTexto, setRespuestasPublicasTexto] = useState(
    flujo?.respuesta_publica.join("\n") ??
      "¡Te acabamos de escribir por mensaje directo! Revisa tus DMs 🙌\n¡Hola! Te enviamos toda la información por privado 📩\nRevisa tu bandeja de mensajes, ya te enviamos los detalles ✨"
  );
  const [botones, setBotones] = useState<BotonFlujo[]>(
    flujo?.botones && flujo.botones.length > 0
      ? flujo.botones
      : [{ titulo: "📅 Agendar Cita", url: "https://wa.me/573000000000" }]
  );
  const [activo, setActivo] = useState(flujo?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregarBoton() {
    if (botones.length >= 3) return;
    setBotones([...botones, { titulo: "🔗 Ver Enlace", url: "https://" }]);
  }

  function actualizarBoton(index: number, campo: keyof BotonFlujo, valor: string) {
    const copia = [...botones];
    copia[index] = { ...copia[index], [campo]: valor };
    setBotones(copia);
  }

  function eliminarBoton(index: number) {
    setBotones(botones.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const palabras = palabrasClaveTexto
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (palabras.length === 0) {
      setError("Debes ingresar al menos una palabra clave.");
      return;
    }

    if (!respuestaPrivada.trim()) {
      setError("El mensaje privado es obligatorio.");
      return;
    }

    const publicas = respuestasPublicasTexto
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    setGuardando(true);
    try {
      await onGuardar({
        id: flujo?.id,
        nombre: nombre.trim() || `Flujo: ${palabras[0]}`,
        conexion_id: conexionId,
        tenant_id: tenantId ?? null,
        palabras_clave: palabras,
        aplica_a: aplicaA,
        respuesta_privada: respuestaPrivada.trim(),
        respuesta_publica: publicas,
        botones: botones.filter((b) => b.titulo.trim() && b.url.trim()),
        activo,
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el flujo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl glass rounded-3xl border border-border p-6 shadow-2xl flex flex-col gap-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {flujo ? "Editar Flujo de Automatización" : "Nuevo Flujo de Automatización"}
            </h3>
            <p className="text-xs text-muted">
              Configura disparadores por palabra clave, respuesta pública y DM interactivo con botones.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Layout en 2 columnas: Formulario + Vista previa Móvil */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Formulario (7 cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nombre del flujo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Promoción Botox / Respuesta Precio"
                className="w-full p-2.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none focus:border-foreground/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Palabras clave que activan el flujo (separadas por coma)
              </label>
              <input
                type="text"
                value={palabrasClaveTexto}
                onChange={(e) => setPalabrasClaveTexto(e.target.value)}
                placeholder="PRECIO, INFO, CITA, VALOR"
                className="w-full p-2.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none focus:border-foreground/30"
              />
              <p className="text-[10px] text-muted mt-1">
                Se evalúan automáticamente sin mayúsculas ni tildes (ej. &quot;información&quot; y &quot;informacion&quot;).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                ¿Dónde aplica?
              </label>
              <select
                value={aplicaA}
                onChange={(e) => setAplicaA(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
              >
                <option value="todas">En todas las publicaciones y reels</option>
                <option value="especifica">Solo en una publicación específica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Respuestas públicas rotativas (un comentario por línea)
              </label>
              <textarea
                value={respuestasPublicasTexto}
                onChange={(e) => setRespuestasPublicasTexto(e.target.value)}
                rows={3}
                placeholder="Escribe una respuesta por línea. Meta elegirá una al azar para evitar spam."
                className="w-full p-2.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mensaje privado por DM
              </label>
              <textarea
                value={respuestaPrivada}
                onChange={(e) => setRespuestaPrivada(e.target.value)}
                rows={4}
                placeholder="Texto del DM que recibirá el usuario de forma inmediata..."
                className="w-full p-2.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none resize-none"
              />
            </div>

            {/* Botones interactivos con enlaces */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground">
                  Botones con enlace (opcional, máx. 3)
                </label>
                {botones.length < 3 && (
                  <button
                    type="button"
                    onClick={agregarBoton}
                    className="text-[11px] text-emerald-400 font-semibold hover:underline"
                  >
                    + Agregar botón
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {botones.map((boton, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Título botón"
                      value={boton.titulo}
                      onChange={(e) => actualizarBoton(idx, "titulo", e.target.value)}
                      className="w-1/3 p-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={boton.url}
                      onChange={(e) => actualizarBoton(idx, "url", e.target.value)}
                      className="flex-1 p-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarBoton(idx)}
                      className="text-muted hover:text-red-400 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="rounded border-border accent-emerald-500"
                />
                Flujo activo inmediatamente
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-alt hover:bg-foreground/10 border border-border text-foreground transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar Flujo ✨"}
              </button>
            </div>
          </form>

          {/* Columna Derecha: Vista previa en Celular (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
              📱 Vista previa en Instagram
            </span>

            {/* Marco de Teléfono */}
            <div className="w-[280px] h-[520px] rounded-[36px] bg-black border-4 border-neutral-700 shadow-2xl p-3 flex flex-col justify-between relative overflow-hidden text-neutral-100 select-none">
              {/* Isla superior */}
              <div className="w-24 h-4 bg-neutral-800 rounded-full mx-auto mb-2" />

              {/* Encabezado Instagram Chat */}
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
                  {instagramUsername ? instagramUsername.slice(0, 2).toUpperCase() : "IG"}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold truncate">@{instagramUsername ?? "tu_cuenta"}</p>
                  <p className="text-[9px] text-neutral-400">Activo(a) ahora</p>
                </div>
              </div>

              {/* Mensajes en pantalla */}
              <div className="flex-1 py-3 flex flex-col gap-2 overflow-y-auto text-[11px]">
                {/* Mensaje de usuario que comentó */}
                <div className="self-end bg-neutral-800 p-2.5 rounded-2xl rounded-tr-xs max-w-[85%] text-[11px] text-neutral-200">
                  {palabrasClaveTexto.split(",")[0]?.trim() || "PRECIO"}
                </div>

                {/* Respuesta automática de la cuenta */}
                <div className="self-start bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] flex flex-col gap-2 text-neutral-200">
                  <p className="leading-snug whitespace-pre-wrap">{respuestaPrivada}</p>

                  {/* Botones interactivos */}
                  {botones.map((b, idx) => (
                    <div
                      key={idx}
                      className="py-1.5 px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-center font-semibold text-[10px] text-sky-400 hover:bg-neutral-700 transition-all cursor-pointer"
                    >
                      {b.titulo || "Botón"}
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra de input falsa de Instagram */}
              <div className="h-8 rounded-full bg-neutral-900 border border-neutral-800 px-3 flex items-center justify-between text-[10px] text-neutral-500">
                <span>Escribe un mensaje...</span>
                <span>💙</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
