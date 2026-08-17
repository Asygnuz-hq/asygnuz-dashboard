"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MetricasCrecimiento } from "./metrics";

const INTERVALO_MS = 2 * 60 * 1000;

export function useMetricasCrecimiento() {
  const [metricas, setMetricas] = useState<MetricasCrecimiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    if (primeraCarga.current) setLoading(true);
    else setActualizando(true);
    try {
      const res = await fetch("/api/espocrm/metrics", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error consultando métricas de EspoCRM");
      setMetricas(body as MetricasCrecimiento);
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
