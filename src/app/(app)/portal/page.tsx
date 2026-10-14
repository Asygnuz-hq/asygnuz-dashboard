"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenantActual } from "@/lib/useTenantActual";
import { useAvance } from "@/lib/portal/useAvance";
import {
  VistaPortal,
  type ProyectoVista,
  type PilarVista,
  type EnlaceVista,
  type ReunionVista,
  type ArchivoVista,
  type ContenidoVista,
} from "@/components/portal/VistaPortal";

type ArchivoConRuta = ArchivoVista & { storage_path: string };

export default function PortalClientePage() {
  const tenant = useTenantActual();
  const avance = useAvance("/api/portal/avance");
  const [loading, setLoading] = useState(true);
  const [proyecto, setProyecto] = useState<ProyectoVista | null>(null);
  const [pilares, setPilares] = useState<PilarVista[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceVista[]>([]);
  const [reuniones, setReuniones] = useState<ReunionVista[]>([]);
  const [archivos, setArchivos] = useState<ArchivoConRuta[]>([]);
  const [contenido, setContenido] = useState<ContenidoVista[]>([]);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const [p, pi, e, r, a, c] = await Promise.all([
        supabase.from("portal_proyecto").select("*").maybeSingle(),
        supabase.from("portal_pilares").select("*").order("orden"),
        supabase.from("portal_enlaces").select("*").order("orden"),
        supabase.from("portal_reuniones").select("*").order("fecha", { ascending: false }),
        supabase.from("portal_archivos").select("*").order("subido_en", { ascending: false }),
        supabase.from("portal_contenido").select("id, estado").order("orden"),
      ]);
      setProyecto(p.data);
      setPilares(pi.data ?? []);
      setEnlaces(e.data ?? []);
      setReuniones(r.data ?? []);
      setArchivos(a.data ?? []);
      setContenido(c.data ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  async function descargar(archivo: ArchivoVista) {
    const conRuta = archivos.find((a) => a.id === archivo.id);
    if (!conRuta) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("portal-archivos")
      .createSignedUrl(conRuta.storage_path, 60);
    if (error || !data) {
      alert("No se pudo generar el link de descarga. Intenta de nuevo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;

  return (
    <VistaPortal
      nombreTenant={tenant?.nombre ?? null}
      colorAcento={tenant?.colorAcento ?? null}
      proyecto={proyecto}
      pilares={pilares}
      contenido={contenido}
      enlaces={enlaces}
      archivos={archivos}
      reuniones={reuniones}
      hrefParrilla="/portal/parrilla"
      onDescargarArchivo={descargar}
      avance={avance}
    />
  );
}
