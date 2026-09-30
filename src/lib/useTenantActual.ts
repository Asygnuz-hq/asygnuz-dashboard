"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type TenantActual = { id: string; nombre: string; logoUrl: string | null; colorAcento: string | null };

export function useTenantActual() {
  const [tenant, setTenant] = useState<TenantActual | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.rpc("tenant_actual");
      const fila = Array.isArray(data) ? data[0] : data;
      if (!cancelado && fila) {
        setTenant({ id: fila.id, nombre: fila.nombre, logoUrl: fila.logo_url ?? null, colorAcento: fila.color_acento ?? null });
      }
    }
    load();
    return () => {
      cancelado = true;
    };
  }, []);

  return tenant;
}
