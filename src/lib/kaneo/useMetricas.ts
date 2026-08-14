"use client";

import { useEffect, useState } from "react";
import type { MetricasKaneo } from "./metrics";

export function useMetricas() {
  const [metricas, setMetricas] = useState<MetricasKaneo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/kaneo/metrics")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Error consultando métricas");
        return body as MetricasKaneo;
      })
      .then((data) => {
        if (!cancelado) setMetricas(data);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : "Error desconocido");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return { metricas, error, loading };
}
