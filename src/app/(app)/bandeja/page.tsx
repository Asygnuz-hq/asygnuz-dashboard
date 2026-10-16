"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ListaConversaciones } from "@/components/bandeja/ListaConversaciones";
import { ChatConversacion } from "@/components/bandeja/ChatConversacion";
import type { IgConversacion, IgMensaje } from "@/lib/bandeja/tipos";
import type { MetaConexion } from "@/lib/meta/client";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export default function BandejaInstagramPage() {
  const [conexiones, setConexiones] = useState<MetaConexion[]>([]);
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string>("todas");
  const [conversaciones, setConversaciones] = useState<IgConversacion[]>([]);
  const [convSeleccionada, setConvSeleccionada] = useState<IgConversacion | null>(null);
  const [mensajes, setMensajes] = useState<IgMensaje[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState<string>("pendiente");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");

  // Cargar cuentas conectadas de Meta / Instagram
  useEffect(() => {
    async function cargarCuentas() {
      try {
        const res = await fetch("/api/meta/conexiones");
        if (res.ok) {
          const data = await res.json();
          // Filtrar solo las que tengan cuenta de Instagram
          // /api/meta/conexiones responde { conexiones: [...] }, no la lista directa.
          const lista: MetaConexion[] = Array.isArray(data) ? data : data?.conexiones ?? [];
          const conIg = lista.filter((c) => c.instagram_business_id);
          setConexiones(conIg);
        }
      } catch (err) {
        console.error("Error cargando conexiones:", err);
      }
    }
    cargarCuentas();
  }, []);

  // Cargar conversaciones al cambiar cuenta o filtro
  useEffect(() => {
    async function cargarConversaciones() {
      setLoadingConvs(true);
      try {
        const params = new URLSearchParams();
        if (cuentaSeleccionadaId !== "todas") {
          params.set("conexion_id", cuentaSeleccionadaId);
        }
        params.set("estado", filtroEstado);
        params.set("tipo", filtroTipo);

        const res = await fetch(`/api/bandeja/conversaciones?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const convs: IgConversacion[] = data.conversaciones ?? [];
          setConversaciones(convs);

          // Si hay una seleccionada, refrescar sus datos; si no, seleccionar la primera
          if (convSeleccionada) {
            const actualizada = convs.find((c) => c.id === convSeleccionada.id);
            if (actualizada) setConvSeleccionada(actualizada);
          } else if (convs.length > 0) {
            setConvSeleccionada(convs[0]);
          }
        }
      } catch (err) {
        console.error("Error cargando conversaciones:", err);
      } finally {
        setLoadingConvs(false);
      }
    }
    cargarConversaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaSeleccionadaId, filtroEstado, filtroTipo]);

  // Cargar mensajes cuando cambia la conversación seleccionada
  const idSeleccionada = convSeleccionada?.id;
  useEffect(() => {
    let activo = true;
    if (!idSeleccionada) return;

    async function cargarMensajes() {
      setLoadingMensajes(true);
      try {
        const res = await fetch(`/api/bandeja/conversaciones/${idSeleccionada}`);
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
  }, [idSeleccionada]);

  // Enviar mensaje manual
  async function handleEnviarMensaje(texto: string): Promise<boolean> {
    if (!convSeleccionada) return false;
    try {
      const res = await fetch(`/api/bandeja/conversaciones/${convSeleccionada.id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mensaje) {
          setMensajes((prev) => [...prev, data.mensaje]);
        }
        // Marcar como respondida localmente
        setConvSeleccionada((prev) => (prev ? { ...prev, estado: "respondida" } : prev));
        setConversaciones((prev) =>
          prev.map((c) => (c.id === convSeleccionada.id ? { ...c, estado: "respondida" } : c))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Cambiar estado (archivar, marcar respondida)
  async function handleCambiarEstado(nuevoEstado: "pendiente" | "respondida" | "archivada") {
    if (!convSeleccionada) return;
    try {
      const res = await fetch(`/api/bandeja/conversaciones/${convSeleccionada.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        setConvSeleccionada((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
        setConversaciones((prev) =>
          prev.map((c) => (c.id === convSeleccionada.id ? { ...c, estado: nuevoEstado } : c))
        );
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-[calc(100vh-5rem)]">
      {/* Barra Superior con Selector de Cuentas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Bandeja de Instagram"
            subtitle="DMs, comentarios y automatizaciones directas en tiempo real"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de cuenta */}
          <select
            value={cuentaSeleccionadaId}
            onChange={(e) => setCuentaSeleccionadaId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl glass border border-border text-foreground focus:outline-none"
          >
            <option value="todas">Todas las cuentas conectadas</option>
            {conexiones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cliente_nombre} {c.instagram_username ? `(@${c.instagram_username})` : ""}
              </option>
            ))}
          </select>

          <Link
            href="/bandeja/flujos"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <span>⚡</span> Flujos Automáticos
          </Link>
        </div>
      </div>

      {/* Panel Principal en 2 Columnas (Estilo Glass) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0 pb-2">
        {/* Columna Izquierda: Lista de Conversaciones (5 cols) */}
        <div className="md:col-span-5 h-full min-h-[400px]">
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

        {/* Columna Derecha: Chat y Respuesta (7 cols) */}
        <div className="md:col-span-7 h-full min-h-[400px]">
          {convSeleccionada ? (
            <ChatConversacion
              conversacion={convSeleccionada}
              mensajes={mensajes}
              onEnviarMensaje={handleEnviarMensaje}
              onCambiarEstado={handleCambiarEstado}
              loadingMensajes={loadingMensajes}
            />
          ) : (
            <div className="h-full glass rounded-2xl border border-border flex flex-col items-center justify-center p-8 text-center text-muted">
              <span className="text-4xl mb-2">💬</span>
              <h4 className="text-sm font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
                Ninguna conversación seleccionada
              </h4>
              <p className="text-xs text-muted max-w-xs mt-1">
                Elige una conversación de la lista para ver el historial y responder directamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
