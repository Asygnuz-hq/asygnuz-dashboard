"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodoMetricas } from "@/lib/portal/avanceTipos";
import type { EstadoAvance } from "@/components/portal/SeccionAvance";

// Carga el Panel de Avance aparte del resto del portal: Kaneo y Meta pueden
// tardar unos segundos y no deben frenar la ficha, los pilares, etc.
// url: /api/portal/avance (cliente) o /api/portal-admin/clientes/<id>/avance.
// Soporta selector de periodo interactivo con persistencia en URL (?periodo=30d).
export function useAvance(baseUrl: string): EstadoAvance {
  const [periodo, setPeriodo] = useState<PeriodoMetricas>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("periodo");
      if (p === "7d" || p === "30d" || p === "90d" || p === "mes") return p;
    }
    return "30d";
  });

  const [estado, setEstado] = useState<{ datos: EstadoAvance["datos"]; cargando: boolean; error: string | null }>({
    datos: null,
    cargando: true,
    error: null,
  });

  const cambiarPeriodo = useCallback((nuevoPeriodo: PeriodoMetricas) => {
    setPeriodo(nuevoPeriodo);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("periodo", nuevoPeriodo);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    const delimitador = baseUrl.includes("?") ? "&" : "?";
    const urlCompleta = `${baseUrl}${delimitador}periodo=${periodo}`;

    fetch(urlCompleta)
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
  }, [baseUrl, periodo]);

  return {
    ...estado,
    periodo,
    cambiarPeriodo,
  };
}
