"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DiagramaFlujoVisual } from "@/components/bandeja/DiagramaFlujoVisual";
import { ModalFlujo } from "@/components/bandeja/ModalFlujo";
import { MetricasBandejaComponent } from "@/components/bandeja/MetricasBandeja";
import { ReporteFlujos } from "@/components/bandeja/ReporteFlujos";
import type { IgFlujo, IgBienvenida, BotonFlujo } from "@/lib/bandeja/tipos";
import type { MetaConexion } from "@/lib/meta/client";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export default function FlujosBandejaPage() {
  const [conexiones, setConexiones] = useState<MetaConexion[]>([]);
  const [conexionSeleccionadaId, setConexionSeleccionadaId] = useState<string>("");
  const [flujos, setFlujos] = useState<IgFlujo[]>([]);
  const [, setBienvenida] = useState<IgBienvenida | null>(null);
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [bienvenidaActiva, setBienvenidaActiva] = useState(true);
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [flujoEnEdicion, setFlujoEnEdicion] = useState<IgFlujo | null>(null);
  const [seccionActiva, setSeccionActiva] = useState<"flujos" | "metricas" | "reporte">("flujos");
  const [dominioLinks, setDominioLinks] = useState("");
  const [guardandoDominio, setGuardandoDominio] = useState(false);
  const [errorDominio, setErrorDominio] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar conexiones
  useEffect(() => {
    async function cargarCuentas() {
      try {
        const res = await fetch("/api/meta/conexiones");
        if (res.ok) {
          const data = await res.json();
          // /api/meta/conexiones responde { conexiones: [...] }, no la lista directa.
          const lista: MetaConexion[] = Array.isArray(data) ? data : data?.conexiones ?? [];
          const conIg = lista.filter((c) => c.instagram_business_id);
          setConexiones(conIg);
          if (conIg.length > 0 && !conexionSeleccionadaId) {
            setConexionSeleccionadaId(conIg[0].id);
          }
        }
      } catch (err) {
        console.error("Error cargando cuentas:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarCuentas();
  }, [conexionSeleccionadaId]);

  const [recargarTrigger, setRecargarTrigger] = useState(0);

  // Cargar flujos y bienvenida de la cuenta seleccionada
  useEffect(() => {
    let activo = true;
    if (!conexionSeleccionadaId) return;

    async function cargar() {
      try {
        const res = await fetch(`/api/bandeja/flujos?conexion_id=${conexionSeleccionadaId}`);
        if (res.ok) {
          const data = await res.json();
          if (activo) {
            setFlujos(data.flujos ?? []);
            setDominioLinks(data.dominio_links ?? "");
            if (data.bienvenida) {
              setBienvenida(data.bienvenida);
              setMensajeBienvenida(data.bienvenida.mensaje);
              setBienvenidaActiva(data.bienvenida.activo);
            } else {
              setBienvenida(null);
              setMensajeBienvenida("¡Hola! Gracias por escribirnos a ASYGNUZ. ¿En qué podemos ayudarte hoy?");
              setBienvenidaActiva(true);
            }
          }
        }
      } catch (err) {
        console.error("Error cargando flujos:", err);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [conexionSeleccionadaId, recargarTrigger]);

  function cargarFlujos() {
    setRecargarTrigger((prev) => prev + 1);
  }

  // Guardar mensaje de bienvenida
  async function handleGuardarBienvenida(e: React.FormEvent) {
    e.preventDefault();
    if (!conexionSeleccionadaId) return;
    setGuardandoBienvenida(true);
    try {
      await fetch("/api/bandeja/bienvenida", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conexion_id: conexionSeleccionadaId,
          mensaje: mensajeBienvenida,
          activo: bienvenidaActiva,
        }),
      });
      await cargarFlujos();
    } catch (err) {
      console.error("Error guardando bienvenida:", err);
    } finally {
      setGuardandoBienvenida(false);
    }
  }

  // Guardar el dominio con el que se arman los links de los DMs de la cuenta
  async function handleGuardarDominio(e: React.FormEvent) {
    e.preventDefault();
    if (!conexionSeleccionadaId) return;
    setGuardandoDominio(true);
    setErrorDominio(null);
    try {
      const res = await fetch("/api/bandeja/dominio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conexion_id: conexionSeleccionadaId,
          dominio_links: dominioLinks.trim().replace(/\/+$/, ""),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorDominio(data?.error ?? "No se pudo guardar el dominio");
      }
    } catch (err) {
      console.error("Error guardando dominio:", err);
      setErrorDominio("No se pudo guardar el dominio");
    } finally {
      setGuardandoDominio(false);
    }
  }

  // Guardar flujo (crear o editar)
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
      // Editar
      await fetch(`/api/bandeja/flujos/${datos.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    } else {
      // Crear
      await fetch("/api/bandeja/flujos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    }
    await cargarFlujos();
  }

  // Activar o pausar flujo
  async function handleAlternarActivo(flujoId: string, nuevoActivo: boolean) {
    try {
      await fetch(`/api/bandeja/flujos/${flujoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoActivo }),
      });
      setFlujos((prev) =>
        prev.map((f) => (f.id === flujoId ? { ...f, activo: nuevoActivo } : f))
      );
    } catch (err) {
      console.error("Error actualizando estado del flujo:", err);
    }
  }

  const conexionActual = conexiones.find((c) => c.id === conexionSeleccionadaId);
  const faltanPermisos =
    conexionActual &&
    conexionActual.instagram_scopes &&
    (!conexionActual.instagram_scopes.includes("instagram_business_manage_messages") ||
      !conexionActual.instagram_scopes.includes("instagram_business_manage_comments"));

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Flujos Automáticos de Instagram"
            subtitle="Disparadores por palabra clave, respuestas públicas, DMs y enlaces rastreados"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/bandeja"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-alt hover:bg-foreground/10 border border-border text-foreground transition-all flex items-center gap-1.5"
          >
            ← Volver a la Bandeja
          </Link>

          <button
            type="button"
            onClick={() => {
              setFlujoEnEdicion(null);
              setModalAbierto(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <span>+</span> Nuevo Flujo
          </button>
        </div>
      </div>

      {/* Selector de cuenta y pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 glass rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted pl-2">Cuenta:</span>
          <select
            value={conexionSeleccionadaId}
            onChange={(e) => setConexionSeleccionadaId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
          >
            {conexiones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cliente_nombre} {c.instagram_username ? `(@${c.instagram_username})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface-alt rounded-xl">
          <button
            onClick={() => setSeccionActiva("flujos")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              seccionActiva === "flujos"
                ? "bg-foreground/15 text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            ⚡ Flujos y Reglas ({flujos.length})
          </button>
          <button
            onClick={() => setSeccionActiva("metricas")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              seccionActiva === "metricas"
                ? "bg-foreground/15 text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            📊 Métricas 360°
          </button>
          <button
            onClick={() => setSeccionActiva("reporte")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              seccionActiva === "reporte"
                ? "bg-foreground/15 text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            📈 Reporte
          </button>
        </div>
      </div>

      {/* Aviso de reconexión si faltan permisos */}
      {faltanPermisos && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Permisos de comentarios y DMs pendientes</p>
              <p className="text-[11px] text-amber-300">
                Esta cuenta se conectó antes de activar los permisos de mensajería de Meta.
              </p>
            </div>
          </div>
          <Link
            href={`/api/meta/instagram-connect?cliente=${encodeURIComponent(conexionActual?.cliente_nombre ?? "")}`}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs shrink-0 hover:bg-amber-300 transition-all"
          >
            Reconectar Instagram
          </Link>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: FLUJOS */}
      {seccionActiva === "flujos" && (
        <div className="flex flex-col gap-6">
          {/* Dominio de los links de esta cuenta */}
          <form
            onSubmit={handleGuardarDominio}
            className="glass rounded-2xl p-5 border border-border flex flex-col gap-2"
          >
            <h4 className="text-sm font-bold text-foreground">Dominio de los enlaces</h4>
            <p className="text-xs text-muted">
              Los links de los DMs usan este dominio en vez de app.asygnuz.com (ej.
              https://valentinamkt.online). La web del cliente debe reenviar /r/:id al dashboard.
              Vacío = dominio del dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={dominioLinks}
                onChange={(e) => setDominioLinks(e.target.value)}
                placeholder="https://tu-dominio.com"
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={guardandoDominio}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-surface-alt hover:bg-foreground/15 border border-border text-foreground transition-all"
              >
                {guardandoDominio ? "Guardando..." : "Guardar dominio"}
              </button>
            </div>
            {errorDominio && <p className="text-xs text-red-400">{errorDominio}</p>}
          </form>

          {/* Tarjeta de Mensaje de Bienvenida */}
          <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👋</span>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Mensaje de Bienvenida en DM
                  </h4>
                  <p className="text-xs text-muted">
                    Se envía automáticamente la primera vez que un usuario escribe un mensaje directo.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={bienvenidaActiva}
                  onChange={(e) => setBienvenidaActiva(e.target.checked)}
                  className="rounded border-border accent-emerald-500"
                />
                Activo
              </label>
            </div>

            <form onSubmit={handleGuardarBienvenida} className="flex flex-col gap-2 pt-2">
              <textarea
                value={mensajeBienvenida}
                onChange={(e) => setMensajeBienvenida(e.target.value)}
                rows={2}
                className="w-full p-3 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardandoBienvenida}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-surface-alt hover:bg-foreground/15 border border-border text-foreground transition-all"
                >
                  {guardandoBienvenida ? "Guardando..." : "Guardar Bienvenida"}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Flujos Visuales */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
              Reglas de Automatización Activas
            </h3>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted">Cargando flujos...</div>
            ) : flujos.length === 0 ? (
              <div className="glass rounded-2xl p-10 border border-border text-center flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">⚡</span>
                <h4 className="text-sm font-bold text-foreground">No tienes flujos configurados aún</h4>
                <p className="text-xs text-muted max-w-md">
                  Crea tu primera regla para responder automáticamente a comentarios con palabras clave como &quot;PRECIO&quot; o &quot;INFO&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFlujoEnEdicion(null);
                    setModalAbierto(true);
                  }}
                  className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background"
                >
                  + Crear primer flujo
                </button>
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
                  onAlternarActivo={(nuevo) => handleAlternarActivo(f.id, nuevo)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: MÉTRICAS 360° */}
      {seccionActiva === "metricas" && (
        <MetricasBandejaComponent
          conexionId={conexionSeleccionadaId}
          esVistaInterna={true}
        />
      )}

      {/* CONTENIDO DE PESTAÑA: REPORTE */}
      {seccionActiva === "reporte" && conexionSeleccionadaId && (
        <ReporteFlujos conexionId={conexionSeleccionadaId} />
      )}

      {/* Modal para Crear / Editar Flujo */}
      {modalAbierto && (
        <ModalFlujo
          flujo={flujoEnEdicion}
          conexionId={conexionSeleccionadaId}
          instagramUsername={conexionActual?.instagram_username}
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
