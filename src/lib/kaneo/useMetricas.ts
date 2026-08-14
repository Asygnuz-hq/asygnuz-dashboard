"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MetricasKaneo } from "./metrics";

// La API tarda unos segundos (recorre relaciones tarea por tarea) — refrescar
// cada 2 minutos da sensación de "en vivo" sin recargar la API sin necesidad.
const INTERVALO_MS = 2 * 60 * 1000;

export function useMetricas() {
  const [metricas, setMetricas] = useState<MetricasKaneo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    if (primeraCarga.current) setLoading(true);
    else setActualizando(true);
    try {
      const res = await fetch("/api/kaneo/metrics", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error consultando métricas");
      setMetricas(body as MetricasKaneo);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
      setActualizando(false);
      primeraCarga.current = false;
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  return { metricas, error, loading, actualizando, recargar: cargar };
}
