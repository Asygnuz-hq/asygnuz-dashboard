"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RequisitosMetrics } from "./requisitos-metrics";

// Igual que useMetricas: la API recorre relaciones tarea por tarea, así que
// refrescamos cada 2 min en vez de cada render.
const INTERVALO_MS = 2 * 60 * 1000;

export function useRequisitos() {
  const [data, setData] = useState<RequisitosMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    if (primeraCarga.current) setLoading(true);
    else setActualizando(true);
    try {
      const res = await fetch("/api/kaneo/requisitos", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error consultando requisitos");
      setData(body as RequisitosMetrics);
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

  return { data, error, loading, actualizando, recargar: cargar };
}
