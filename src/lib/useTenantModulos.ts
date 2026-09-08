"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ModulosHabilitados = {
  financiero?: boolean;
  marketing_pauta?: boolean;
  crm?: boolean;
  operacion?: boolean;
  [modulo: string]: boolean | undefined;
};

// null mientras carga (evita parpadeo mostrando/ocultando módulos antes de
// tiempo) — RPC en vez de leer tenants/profiles directo por el mismo motivo
// que useIsEmergencia: la política RLS de esas tablas depende de
// current_tenant_id(), que a su vez lee profiles — más simple resolverlo
// todo del lado de la función security definer.
export function useTenantModulos() {
  const [modulos, setModulos] = useState<ModulosHabilitados | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.rpc("modulos_habilitados_tenant");
      if (!cancelado) setModulos((data as ModulosHabilitados) ?? {});
    }
    load();
    return () => {
      cancelado = true;
    };
  }, []);

  return modulos;
}
