"use client";

import { useCallback, useEffect, useState } from "react";
import { FUENTE_PRINCIPAL, type KaneoFuente } from "./fuentes";

// Lista de Kaneos que el cliente puede mirar (el propio + los de terceros a
// los que le dieron acceso de solo lectura). Devuelve también la fuente
// seleccionada y su setter -- la selección vive en memoria, arranca en la
// principal en cada carga.
export function useKaneoFuentes() {
  const [fuentes, setFuentes] = useState<KaneoFuente[]>([]);
  const [fuenteId, setFuenteId] = useState<string>(FUENTE_PRINCIPAL);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/kaneo/fuentes", { cache: "no-store" });
      const body = await res.json();
      if (res.ok && Array.isArray(body.fuentes)) {
        setFuentes(body.fuentes as KaneoFuente[]);
      }
    } catch {
      // silencioso: sin fuentes extra el selector no se muestra y todo
      // sigue apuntando a la principal.
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { fuentes, fuenteId, setFuenteId, cargando, hayVarias: fuentes.length > 1 };
}
