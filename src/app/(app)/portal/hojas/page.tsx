"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useTenantActual } from "@/lib/useTenantActual";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import { HojasTrabajoVista } from "@/components/portal/hojas/HojasTrabajoVista";
import type { HojaTrabajo } from "@/lib/portal/hojasTipos";

function HojasClienteContenido() {
  const searchParams = useSearchParams();
  const hojaInicialId = searchParams.get("hoja");
  const tenant = useTenantActual();
  const [loading, setLoading] = useState(true);
  const [hojas, setHojas] = useState<HojaTrabajo[]>([]);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase.from("portal_hojas").select("*").order("orden");
      setHojas((data ?? []) as HojaTrabajo[]);
      setLoading(false);
    }
    cargar();
  }, []);

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
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={13} />
          <span>Volver al resumen</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
          Hojas de trabajo
        </h1>
        <p className="text-sm text-muted mt-1">
          Planes de campaña, banco de ideas, benchmarking y matrices estratégicas actualizadas en vivo.
        </p>
      </div>

      <HojasTrabajoVista
        hojas={hojas}
        editable={false}
        colorAcento={tenant?.colorAcento}
        hojaInicialId={hojaInicialId}
      />
    </div>
  );
}

export default function HojasClientePage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-2xl" />}>
      <HojasClienteContenido />
    </Suspense>
  );
}
