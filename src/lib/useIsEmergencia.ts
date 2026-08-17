"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useIsEmergencia() {
  const [isEmergencia, setIsEmergencia] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      const supabase = createClient();
      // RPC (security definer) en vez de leer profiles directo: para un
      // usuario con rol emergencia, la política RLS de profiles le niega
      // leer su propia fila.
      const { data } = await supabase.rpc("es_emergencia");
      if (!cancelado) setIsEmergencia(Boolean(data));
    }
    load();
    return () => {
      cancelado = true;
    };
  }, []);

  return isEmergencia;
}
