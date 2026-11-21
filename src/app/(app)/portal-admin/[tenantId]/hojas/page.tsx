"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import { HojasTrabajoVista } from "@/components/portal/hojas/HojasTrabajoVista";
import type { ColumnaHoja, FilaHoja, HojaTrabajo, TipoHoja } from "@/lib/portal/hojasTipos";

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

export default function HojasAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [hojas, setHojas] = useState<HojaTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api(`/api/portal-admin/clientes/${tenantId}`)
      .then((data) => {
        setCliente(data.cliente);
        setHojas(data.hojas ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando hojas."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function guardarHoja(
    hojaId: string,
    cambios: { titulo?: string; descripcion?: string; visibleCliente?: boolean; columnas?: ColumnaHoja[]; filas?: FilaHoja[] }
  ) {
    const antes = hojas;
    setHojas((prev) =>
      prev.map((h) =>
        h.id === hojaId
          ? {
              ...h,
              ...(cambios.titulo !== undefined ? { titulo: cambios.titulo } : {}),
              ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion } : {}),
              ...(cambios.visibleCliente !== undefined ? { visible_cliente: cambios.visibleCliente } : {}),
              ...(cambios.columnas !== undefined ? { columnas: cambios.columnas } : {}),
              ...(cambios.filas !== undefined ? { filas: cambios.filas } : {}),
            }
          : h
      )
    );
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/hojas/${hojaId}`, {
        method: "PUT",
        body: JSON.stringify(cambios),
      });
      setHojas((prev) => prev.map((h) => (h.id === hojaId ? data.hoja : h)));
    } catch (err) {
      setHojas(antes);
      setError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
    }
  }

  async function crearHoja(nueva: {
    titulo: string;
    tipo: TipoHoja;
    descripcion?: string;
    visibleCliente: boolean;
    columnas: ColumnaHoja[];
    filas: FilaHoja[];
  }): Promise<HojaTrabajo | null> {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/hojas`, {
        method: "POST",
        body: JSON.stringify(nueva),
      });
      setHojas((prev) => [...prev, data.hoja]);
      return data.hoja;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la hoja.");
      return null;
    }
  }

  async function borrarHoja(hojaId: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/hojas/${hojaId}`, { method: "DELETE" });
    setHojas((prev) => prev.filter((h) => h.id !== hojaId));
  }

  async function pasarIdeaAParrilla(fila: FilaHoja) {
    const titulo = String(fila.idea ?? fila.titulo ?? "Idea de contenido").slice(0, 160);
    const uso = String(fila.uso ?? "Orgánico");
    await api(`/api/portal-admin/clientes/${tenantId}/contenido`, {
      method: "POST",
      body: JSON.stringify({
        titulo,
        plataforma: /pauta/i.test(uso) ? "Meta Ads" : "Instagram",
        uso,
        pilar: String(fila.pilar ?? "").slice(0, 60) || undefined,
        tipo: String(fila.formato ?? "Reels").slice(0, 60) || "Reels",
        estado: "idea",
        notas: [fila.referente && `Referente: ${fila.referente}`, fila.angulo && `Ángulo: ${fila.angulo}`]
          .filter(Boolean)
          .join(" · "),
        visibleCliente: true,
        guionVisibleCliente: false,
      }),
    });
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;
  if (!cliente) return <p className="text-muted p-6">{error || "Cliente no encontrado."}</p>;

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
          Hojas de trabajo (Excel)
        </h1>
        <p className="text-sm text-muted mt-1">
          Edita celdas directo como en Excel, sube archivos .xlsx y elige qué pestañas ve el cliente en su portal.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <HojasTrabajoVista
        hojas={hojas}
        editable
        colorAcento={cliente.color_acento}
        onGuardarHoja={guardarHoja}
        onCrearHoja={crearHoja}
        onBorrarHoja={borrarHoja}
        onPasarIdeaAParrilla={pasarIdeaAParrilla}
      />
    </div>
  );
}
