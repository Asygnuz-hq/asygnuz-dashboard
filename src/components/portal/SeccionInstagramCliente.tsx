"use client";

import { useState, useEffect } from "react";
import { DiagramaFlujoVisual } from "@/components/bandeja/DiagramaFlujoVisual";
import { ModalFlujo } from "@/components/bandeja/ModalFlujo";
import { ListaConversaciones } from "@/components/bandeja/ListaConversaciones";
import { ChatConversacion } from "@/components/bandeja/ChatConversacion";
import { MetricasBandejaComponent } from "@/components/bandeja/MetricasBandeja";
import type { IgFlujo, IgConversacion, IgMensaje, BotonFlujo } from "@/lib/bandeja/tipos";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

interface SeccionInstagramClienteProps {
  tenantId: string;
}

export function SeccionInstagramCliente({ tenantId }: SeccionInstagramClienteProps) {
  const [subPestana, setSubPestana] = useState<"flujos" | "bandeja" | "metricas" | "guia">("flujos");
  const [conexionId, setConexionId] = useState<string | null>(null);
  const [guiaMarca, setGuiaMarca] = useState("");
  const [guardandoGuia, setGuardandoGuia] = useState(false);
  const [mensajeGuia, setMensajeGuia] = useState<string | null>(null);

  const [flujos, setFlujos] = useState<IgFlujo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [flujoEnEdicion, setFlujoEnEdicion] = useState<IgFlujo | null>(null);

  // Bandeja del cliente
  const [conversaciones, setConversaciones] = useState<IgConversacion[]>([]);
  const [convSeleccionada, setConvSeleccionada] = useState<IgConversacion | null>(null);
  const [mensajes, setMensajes] = useState<IgMensaje[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Cargar fuentes vinculadas y guía de marca
  useEffect(() => {
    async function inicializar() {
      try {
        const fuentesRes = await fetch(`/api/portal-admin/clientes/${tenantId}/fuentes`);
        if (fuentesRes.ok) {
          const fuentesData = await fuentesRes.json();
          const conxMeta = fuentesData.meta?.[0];
          if (conxMeta) {
            setConexionId(conxMeta.id);
          }
        }

        const guiaRes = await fetch(`/api/portal-admin/clientes/${tenantId}/guia-marca`);
        if (guiaRes.ok) {
          const guiaData = await guiaRes.json();
          setGuiaMarca(guiaData.guia_marca ?? "");
          if (guiaData.conexion_id) setConexionId(guiaData.conexion_id);
        }
      } catch (err) {
        console.error("Error inicializando Instagram del cliente:", err);
      }
    }
    inicializar();
  }, [tenantId]);

  // Cargar flujos del cliente
  const [recargarFlujos, setRecargarFlujos] = useState(0);

  // Cargar flujos del cliente
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const res = await fetch(`/api/bandeja/flujos?tenant_id=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          if (activo) setFlujos(data.flujos ?? []);
        }
      } catch (err) {
        console.error("Error cargando flujos:", err);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [tenantId, recargarFlujos]);

  function cargarFlujos() {
    setRecargarFlujos((v) => v + 1);
  }

  // Cargar conversaciones del cliente
  useEffect(() => {
    let activo = true;
    if (subPestana !== "bandeja") return;

    async function cargarConversaciones() {
      setLoadingConvs(true);
      try {
        const params = new URLSearchParams();
        params.set("tenant_id", tenantId);
        params.set("estado", filtroEstado);
        params.set("tipo", filtroTipo);

        const res = await fetch(`/api/bandeja/conversaciones?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const convs: IgConversacion[] = data.conversaciones ?? [];
          if (activo) {
            setConversaciones(convs);
            if (convs.length > 0 && !convSeleccionada) {
              setConvSeleccionada(convs[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error cargando conversaciones del cliente:", err);
      } finally {
        if (activo) setLoadingConvs(false);
      }
    }
    cargarConversaciones();
    return () => {
      activo = false;
    };
  }, [tenantId, subPestana, filtroEstado, filtroTipo, convSeleccionada]);

  // Cargar mensajes de conversación
  const convId = convSeleccionada?.id;
  useEffect(() => {
    let activo = true;
    if (!convId || subPestana !== "bandeja") return;

    async function cargarMensajes() {
      setLoadingMensajes(true);
      try {
        const res = await fetch(`/api/bandeja/conversaciones/${convId}`);
        if (res.ok) {
          const data = await res.json();
          if (activo) setMensajes(data.mensajes ?? []);
        }
      } catch (err) {
        console.error("Error cargando mensajes:", err);
      } finally {
        if (activo) setLoadingMensajes(false);
      }
    }
    cargarMensajes();
    return () => {
      activo = false;
    };
  }, [convId, subPestana]);

  // Guardar Guía de Marca
  async function handleGuardarGuia(e: React.FormEvent) {
    e.preventDefault();
    if (!conexionId) {
      setMensajeGuia("Este cliente aún no tiene una cuenta de Instagram vinculada.");
      return;
    }
    setGuardandoGuia(true);
    setMensajeGuia(null);
    try {
      const res = await fetch(`/api/portal-admin/clientes/${tenantId}/guia-marca`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexion_id: conexionId, guia_marca: guiaMarca }),
      });
      if (res.ok) {
        setMensajeGuia("Guía de marca guardada para Claude.");
      } else {
        setMensajeGuia("Error al guardar la guía de marca.");
      }
    } catch {
      setMensajeGuia("Error de conexión al guardar.");
    } finally {
      setGuardandoGuia(false);
    }
  }

  // Guardar Flujo
  async function handleGuardarFlujo(datos: {
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
  }) {
    if (datos.id) {
      await fetch(`/api/bandeja/flujos/${datos.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    } else {
      await fetch("/api/bandeja/flujos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    }
    await cargarFlujos();
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Subnavegación */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 glass rounded-xl">
          {[
            { id: "flujos", label: "⚡ Flujos Automáticos" },
            { id: "bandeja", label: "💬 Bandeja de DMs" },
            { id: "metricas", label: "📊 Analítica 360°" },
            { id: "guia", label: "🤖 Guía de Marca (Claude)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubPestana(tab.id as typeof subPestana)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                subPestana === tab.id
                  ? "bg-foreground/15 text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subPestana === "flujos" && (
          <button
            type="button"
            disabled={!conexionId}
            onClick={() => {
              setFlujoEnEdicion(null);
              setModalAbierto(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all"
          >
            + Nuevo Flujo para este Cliente
          </button>
        )}
      </div>

      {/* 1. FLUJOS */}
      {subPestana === "flujos" && (
        <div className="flex flex-col gap-4">
          {flujos.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-xs text-muted flex flex-col items-center gap-2">
              <span className="text-3xl">⚡</span>
              <p className="font-semibold text-foreground">Sin flujos configurados para este cliente</p>
              <p className="max-w-md">
                Configura respuestas automáticas a palabras clave en comentarios y DMs.
              </p>
            </div>
          ) : (
            flujos.map((f) => (
              <DiagramaFlujoVisual
                key={f.id}
                flujo={f}
                onEditar={() => {
                  setFlujoEnEdicion(f);
                  setModalAbierto(true);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* 2. BANDEJA DEL CLIENTE */}
      {subPestana === "bandeja" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[550px]">
          <div className="md:col-span-5 h-full">
            <ListaConversaciones
              conversaciones={conversaciones}
              seleccionadaId={convSeleccionada?.id ?? null}
              onSeleccionar={(c) => setConvSeleccionada(c)}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              filtroTipo={filtroTipo}
              setFiltroTipo={setFiltroTipo}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              loading={loadingConvs}
            />
          </div>
          <div className="md:col-span-7 h-full">
            {convSeleccionada ? (
              <ChatConversacion
                conversacion={convSeleccionada}
                mensajes={mensajes}
                onEnviarMensaje={async (txt) => {
                  const res = await fetch(`/api/bandeja/conversaciones/${convSeleccionada.id}/responder`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ texto: txt }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.mensaje) setMensajes((p) => [...p, data.mensaje]);
                    return true;
                  }
                  return false;
                }}
                onCambiarEstado={async (est) => {
                  await fetch(`/api/bandeja/conversaciones/${convSeleccionada.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estado: est }),
                  });
                  setConvSeleccionada((p) => (p ? { ...p, estado: est } : p));
                }}
                loadingMensajes={loadingMensajes}
              />
            ) : (
              <div className="h-full glass rounded-2xl flex items-center justify-center text-xs text-muted">
                Selecciona una conversación para responder.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MÉTRICAS 360° */}
      {subPestana === "metricas" && (
        <MetricasBandejaComponent tenantId={tenantId} esVistaInterna={true} />
      )}

      {/* 4. GUÍA DE MARCA */}
      {subPestana === "guia" && (
        <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
              Guía de Marca para Respuestas de Claude
            </h4>
            <p className="text-xs text-muted">
              Define el tono, políticas de precios, servicios que no deben prometerse y enlaces de agenda.
              Esta guía es leída directamente por Claude Code para redactar respuestas personalizadas a los DMs.
            </p>
          </div>

          {mensajeGuia && (
            <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              {mensajeGuia}
            </p>
          )}

          <form onSubmit={handleGuardarGuia} className="flex flex-col gap-3">
            <textarea
              value={guiaMarca}
              onChange={(e) => setGuiaMarca(e.target.value)}
              rows={6}
              placeholder="Ejemplo:
- Tono: Médico, cercano, empático y formal (tratar de usted).
- Precios públicos: Valoración dermatológica $250.000 COP. Procedimientos requieren cita presencial.
- Qué NO prometer: No dar diagnósticos por mensaje directo ni prometer resultados mágicos.
- Link de agenda: https://wa.me/573001234567"
              className="w-full p-3.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none resize-none leading-relaxed font-mono"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardandoGuia || !conexionId}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {guardandoGuia ? "Guardando..." : "Guardar Guía de Marca 💾"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Crear / Editar Flujo */}
      {modalAbierto && conexionId && (
        <ModalFlujo
          flujo={flujoEnEdicion}
          conexionId={conexionId}
          tenantId={tenantId}
          onGuardar={handleGuardarFlujo}
          onCerrar={() => {
            setModalAbierto(false);
            setFlujoEnEdicion(null);
          }}
        />
      )}
    </div>
  );
}
