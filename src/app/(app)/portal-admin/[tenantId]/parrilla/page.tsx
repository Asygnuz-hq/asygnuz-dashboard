"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import ParrillaVista, { type FilaImportable } from "@/components/portal/parrilla/ParrillaVista";
import { CAMPO_API, type Contenido } from "@/components/portal/parrilla/tipos";

type Cliente = { id: string; nombre: string; slug: string; color_acento?: string | null };

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default function ParrillaAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api(`/api/portal-admin/clientes/${tenantId}`)
      .then((data) => {
        setCliente(data.cliente);
        setContenido(data.contenido ?? []);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Error cargando."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function actualizar(id: string, campo: keyof Contenido, valor: string | boolean) {
    const antes = contenido;
    setContenido((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [campo]: typeof valor === "boolean" ? valor : valor || null } : c
      )
    );
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [CAMPO_API[campo]]: valor }),
      });
      setContenido((prev) => prev.map((c) => (c.id === id ? data.contenido : c)));
      setMessage(null);
    } catch (err) {
      setContenido(antes);
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function agregar(fecha: string, campana?: string) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido`, {
        method: "POST",
        body: JSON.stringify({
          titulo: "Nueva pieza",
          plataforma: "Instagram",
          uso: "Orgánico",
          estado: "idea",
          fechaPublicacion: fecha,
          campana: campana || undefined,
          visibleCliente: true,
          guionVisibleCliente: false,
        }),
      });
      setContenido((prev) => [...prev, data.contenido]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo agregar.");
    }
  }

  async function importar(filas: FilaImportable[], campana?: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido/importar`, {
      method: "POST",
      body: JSON.stringify({ filas, campana }),
    });
    setContenido((prev) => [...prev, ...(data.insertados ?? [])]);
  }

  async function borrar(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, { method: "DELETE" });
    setContenido((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;
  if (!cliente) return <p className="text-muted p-6">{message || "Cliente no encontrado."}</p>;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <Link
          href={`/portal-admin/${tenantId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={13} />
          <span>{cliente.nombre}</span>
        </Link>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>
          Parrilla de contenido
        </h1>
        <p className="text-sm text-muted mt-1">
          Edición directa tipo Excel. Abre una fila para gestionar guion (gancho/cuerpo/CTA), visibilidad y aprobaciones.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm text-muted">{message}</div>
      )}

      <ParrillaVista
        contenido={contenido}
        editable
        colorAcento={cliente.color_acento}
        onActualizar={actualizar}
        onAgregar={agregar}
        onImportar={importar}
        onBorrar={borrar}
      />
    </div>
  );
}
