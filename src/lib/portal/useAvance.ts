"use client";

import { useEffect, useState } from "react";
import type { EstadoAvance } from "@/components/portal/SeccionAvance";

// Carga el Panel de Avance aparte del resto del portal: Kaneo y Meta pueden
// tardar unos segundos y no deben frenar la ficha, los pilares, etc.
// url: /api/portal/avance (cliente) o /api/portal-admin/clientes/<id>/avance.
export function useAvance(url: string): EstadoAvance {
  const [estado, setEstado] = useState<EstadoAvance>({ datos: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;
    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        if (vigente) setEstado({ datos: data.avance, cargando: false, error: null });
      })
      .catch((err: unknown) => {
        if (vigente) {
          setEstado({ datos: null, cargando: false, error: err instanceof Error ? err.message : "Error desconocido" });
        }
      });
    return () => {
      vigente = false;
    };
  }, [url]);

  return estado;
}
