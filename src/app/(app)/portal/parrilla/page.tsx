"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useTenantActual } from "@/lib/useTenantActual";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import ParrillaVista from "@/components/portal/parrilla/ParrillaVista";
import type { Contenido } from "@/components/portal/parrilla/tipos";

export default function ParrillaClientePage() {
  const tenant = useTenantActual();
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase.from("portal_contenido").select("*").order("orden");
      setContenido((data ?? []) as Contenido[]);
      setLoading(false);
    }
    cargar();
  }, []);

  async function aprobar(
    id: string,
    estado: "aprobado" | "cambios" | "pendiente",
    comentario: string
  ) {
    setAviso(null);
    const res = await fetch(`/api/portal/contenido/${id}/aprobacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAviso(data.error || "No se pudo guardar tu revisión.");
      return;
    }
    setContenido((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              aprobacion_cliente: data.aprobacion.aprobacion_cliente,
              comentario_cliente: data.aprobacion.comentario_cliente,
              aprobado_en: data.aprobacion.aprobado_en,
            }
          : c
      )
    );
    setAviso(estado === "aprobado" ? "Pieza aprobada." : "Solicitud de ajuste enviada al equipo.");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-white"
        >
          <ArrowLeft size={13} />
          <span>Volver al resumen</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-white" style={{ fontFamily: FUENTE_DISPLAY }}>
          Parrilla de contenido
        </h1>
        <p className="text-sm text-muted mt-1">
          Haz clic en cualquier pieza para revisar el detalle, copiar el texto o aprobarla en un clic.
        </p>
      </div>

      {aviso && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white">
          {aviso}
        </div>
      )}

      <ParrillaVista
        contenido={contenido}
        editable={false}
        colorAcento={tenant?.colorAcento}
        onAprobar={aprobar}
      />
    </div>
  );
}
