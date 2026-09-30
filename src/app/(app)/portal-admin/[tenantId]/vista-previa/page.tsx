"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  VistaPortal,
  type ProyectoVista,
  type PilarVista,
  type EnlaceVista,
  type ReunionVista,
  type ArchivoVista,
  type ContenidoVista,
} from "@/components/portal/VistaPortal";

async function api(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Igual a /portal, pero con los datos leídos vía la API de admin en vez de
// RLS — así JM ve exactamente lo que va a ver el cliente sin tener que
// crearse (o pedir prestada) una sesión con el login de ese cliente.
export default function VistaPreviaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreTenant, setNombreTenant] = useState<string | null>(null);
  const [colorAcento, setColorAcento] = useState<string | null>(null);
  const [proyecto, setProyecto] = useState<ProyectoVista | null>(null);
  const [pilares, setPilares] = useState<PilarVista[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceVista[]>([]);
  const [reuniones, setReuniones] = useState<ReunionVista[]>([]);
  const [archivos, setArchivos] = useState<ArchivoVista[]>([]);
  const [contenido, setContenido] = useState<ContenidoVista[]>([]);

  useEffect(() => {
    async function cargar() {
      try {
        const data = await api(`/api/portal-admin/clientes/${tenantId}`);
        setNombreTenant(data.cliente?.nombre ?? null);
        setColorAcento(data.cliente?.color_acento ?? null);
        setProyecto(data.proyecto);
        setPilares(data.pilares ?? []);
        setEnlaces(data.enlaces ?? []);
        setReuniones(data.reuniones ?? []);
        setArchivos(data.archivos ?? []);
        setContenido(data.contenido ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando la vista previa.");
      }
      setLoading(false);
    }
    cargar();
  }, [tenantId]);

  async function descargar(archivo: ArchivoVista) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/archivos/${archivo.id}`);
      window.open(data.url, "_blank");
    } catch {
      alert("No se pudo generar el link. Intenta de nuevo.");
    }
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;
  if (error) return <p className="text-muted p-6">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="px-0 -mb-2">
        <Link href={`/portal-admin/${tenantId}`} className="text-sm text-muted hover:text-foreground">
          ← Volver a gestión
        </Link>
        <p className="text-xs text-muted mt-1">
          Esto es exactamente lo que ve el cliente al entrar — no es editable desde acá.
        </p>
      </div>
      <VistaPortal
        nombreTenant={nombreTenant}
        colorAcento={colorAcento}
        proyecto={proyecto}
        pilares={pilares}
        contenido={contenido}
        enlaces={enlaces}
        archivos={archivos}
        reuniones={reuniones}
        hrefParrilla={`/portal-admin/${tenantId}/parrilla`}
        onDescargarArchivo={descargar}
      />
    </div>
  );
}
