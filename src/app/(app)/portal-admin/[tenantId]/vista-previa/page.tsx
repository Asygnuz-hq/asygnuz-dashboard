"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react";
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
import { AperturaLogo } from "@/components/portal/AperturaLogo";
import type { HojaTrabajo } from "@/lib/portal/hojasTipos";

async function api(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Vista previa exacta del portal del cliente, incluyendo un botón para
// disparar en vivo la apertura cinematográfica con el logo del cliente.
export default function VistaPreviaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const avance = useAvance(`/api/portal-admin/clientes/${tenantId}/avance`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreTenant, setNombreTenant] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [taglinePortal, setTaglinePortal] = useState<string | null>(null);
  const [colorAcento, setColorAcento] = useState<string | null>(null);
  const [proyecto, setProyecto] = useState<ProyectoVista | null>(null);
  const [pilares, setPilares] = useState<PilarVista[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceVista[]>([]);
  const [reuniones, setReuniones] = useState<ReunionVista[]>([]);
  const [archivos, setArchivos] = useState<ArchivoVista[]>([]);
  const [contenido, setContenido] = useState<ContenidoVista[]>([]);
  const [hojas, setHojas] = useState<HojaTrabajo[]>([]);
  const [probandoSplash, setProbandoSplash] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const data = await api(`/api/portal-admin/clientes/${tenantId}`);
        setNombreTenant(data.cliente?.nombre ?? null);
        setLogoUrl(data.cliente?.logo_url ?? null);
        setTaglinePortal(data.cliente?.tagline_portal ?? null);
        setColorAcento(data.cliente?.color_acento ?? null);
        setProyecto(data.proyecto);
        setPilares(data.pilares ?? []);
        setEnlaces(data.enlaces ?? []);
        setReuniones(data.reuniones ?? []);
        setArchivos(data.archivos ?? []);
        // Solo piezas y hojas visibles al cliente para fidelidad 100%
        setContenido(
          (data.contenido ?? []).filter((c: ContenidoVista) => c.visible_cliente !== false)
        );
        setHojas((data.hojas ?? []).filter((h: HojaTrabajo) => h.visible_cliente === true));
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
    <div className="flex flex-col gap-5">
      {probandoSplash && (
        <AperturaLogo
          nombre={nombreTenant ?? "Portal"}
          logoUrl={logoUrl}
          colorAcento={colorAcento}
          tagline={taglinePortal}
          forzar
          onTerminar={() => setProbandoSplash(false)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <Link
            href={`/portal-admin/${tenantId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft size={13} />
            <span>Volver a gestión</span>
          </Link>
          <p className="text-xs text-muted mt-0.5">
            Vista exacta del cliente (oculta piezas/hojas marcadas como internas ASYGNUZ).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setProbandoSplash(true)}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold cursor-pointer"
          style={{
            borderColor: `color-mix(in srgb, ${colorAcento || "#C9A45C"} 45%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${colorAcento || "#C9A45C"} 14%, transparent)`,
            color: colorAcento || "#C9A45C",
          }}
        >
          <Sparkle size={14} weight="fill" />
          <span>Probar apertura con logo</span>
        </button>
      </div>

      <VistaPortal
        nombreTenant={nombreTenant}
        logoUrl={logoUrl}
        taglinePortal={taglinePortal}
        colorAcento={colorAcento}
        proyecto={proyecto}
        pilares={pilares}
        contenido={contenido}
        enlaces={enlaces}
        archivos={archivos}
        reuniones={reuniones}
        hojas={hojas}
        hrefParrilla={`/portal-admin/${tenantId}/parrilla`}
        hrefHojas={`/portal-admin/${tenantId}/hojas`}
        onDescargarArchivo={descargar}
        avance={avance}
      />
    </div>
  );
}
