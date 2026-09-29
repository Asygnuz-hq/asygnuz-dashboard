"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// A propósito NO es "eres admin de ASYGNUZ" (eso lo cumplen Pablo, Andrés...)
// sino "gestiona_portales" en tu fila de profiles — JM pidió que Portales de
// Clientes (Growth) lo vea solo la persona que él marque, no todo el equipo.
export function useGestionaPortales() {
  const [puede, setPuede] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.rpc("gestiona_portales");
      if (!cancelado) setPuede(Boolean(data));
    }
    load();
    return () => {
      cancelado = true;
    };
  }, []);

  return puede;
}
