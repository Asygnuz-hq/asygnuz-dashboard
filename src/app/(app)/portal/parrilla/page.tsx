"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import ParrillaVista from "@/components/portal/parrilla/ParrillaVista";
import type { Contenido } from "@/components/portal/parrilla/tipos";

export default function ParrillaClientePage() {
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState<Contenido[]>([]);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase.from("portal_contenido").select("*").order("orden");
      setContenido(data ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  if (loading) return <p className="text-muted p-6">Cargando...</p>;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <Link href="/portal" className="text-sm text-muted hover:text-foreground">
          ← Mi Portal
        </Link>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>🚀 Parrilla de contenido</h1>
        <p className="text-sm text-muted mt-1">Abre una publicación para ver el copy completo o copiarlo.</p>
      </div>
      <ParrillaVista contenido={contenido} editable={false} />
    </div>
  );
}
