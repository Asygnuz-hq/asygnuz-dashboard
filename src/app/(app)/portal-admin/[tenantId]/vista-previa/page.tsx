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
import {
  BotonTemaPortal,
  PortalThemeProvider,
  usePortalTheme,
} from "@/components/portal/PortalThemeContext";
import type { HojaTrabajo } from "@/lib/portal/hojasTipos";

async function api(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Vista previa exacta del portal del cliente, incluyendo selector Light/Dark
// y botón para disparar en vivo la apertura con el logo del cliente.
export default function VistaPreviaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <PortalThemeProvider inicial="light">
      <VistaPreviaInterior tenantId={tenantId} />
    </PortalThemeProvider>
  );
}

function VistaPreviaInterior({ tenantId }: { tenantId: string }) {
  const { modo } = usePortalTheme();
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

  const acento = colorAcento || "#C9A45C";

  return (
    <div className="flex flex-col gap-5">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {probandoSplash && (
        <AperturaLogo
          nombre={nombreTenant ?? "Portal"}
          logoUrl={logoUrl}
          colorAcento={acento}
          tagline={taglinePortal}
          modo={modo}
          forzar
          onTerminar={() => setProbandoSplash(false)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
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

        <div
          className="portal-shell flex items-center gap-2 rounded-full bg-transparent!"
          data-portal-mode={modo}
          style={
            {
              "--portal-accent": acento,
              background: "transparent",
              backgroundImage: "none",
            } as React.CSSProperties
          }
        >
          <BotonTemaPortal />
          <button
            type="button"
            onClick={() => setProbandoSplash(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold cursor-pointer"
            style={{
              borderColor: `color-mix(in srgb, ${acento} 48%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${acento} 16%, transparent)`,
              color: acento,
            }}
          >
            <Sparkle size={14} weight="fill" />
            <span>Probar apertura con logo</span>
          </button>
        </div>
      </div>

      <div
        className="portal-shell rounded-3xl p-6 sm:p-8 border"
        data-portal-mode={modo}
        style={
          {
            "--portal-accent": acento,
            borderColor: "var(--p-border)",
          } as React.CSSProperties
        }
      >
        <VistaPortal
          nombreTenant={nombreTenant}
          logoUrl={logoUrl}
          taglinePortal={taglinePortal}
          colorAcento={acento}
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
    </div>
  );
}
