"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import ParrillaVista from "@/components/portal/parrilla/ParrillaVista";
import { CAMPO_API, type Contenido } from "@/components/portal/parrilla/tipos";

type Cliente = { id: string; nombre: string; slug: string };

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
        setContenido(data.contenido);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Error cargando."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Optimista: la celda cambia al instante; si la API falla se revierte y
  // se muestra el error arriba.
  async function actualizar(id: string, campo: keyof Contenido, valor: string) {
    const antes = contenido;
    setContenido((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor || null } : c)));
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

  async function agregar(fecha: string) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido`, {
        method: "POST",
        body: JSON.stringify({ titulo: "Nueva publicación", plataforma: "Instagram", estado: "idea", fechaPublicacion: fecha }),
      });
      setContenido((prev) => [...prev, data.contenido]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo agregar.");
    }
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
        <Link href={`/portal-admin/${tenantId}`} className="text-sm text-muted hover:text-foreground">
          ← {cliente.nombre}
        </Link>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>🚀 Parrilla de contenido</h1>
        <p className="text-sm text-muted mt-1">Clic en cualquier celda para editarla. El copy y las notas se abren en el detalle.</p>
      </div>

      {message && (
        <div className="rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm text-muted">{message}</div>
      )}

      <ParrillaVista contenido={contenido} editable onActualizar={actualizar} onAgregar={agregar} onBorrar={borrar} />
    </div>
  );
}
