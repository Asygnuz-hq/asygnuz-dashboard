"use client";

import { useEffect, useRef, useState } from "react";

// Anima un número de 0 (o del valor anterior) hasta `target` — para que las
// cifras del dashboard "suban" al cargar en vez de aparecer de una vez.
// Devuelve el valor intermedio en cada frame; quien lo use lo formatea
// (moneda, porcentaje, etc.) con su propio formatter.
export function useCountUp(target: number, durationMs = 900) {
  const [valor, setValor] = useState(0);
  const inicioRef = useRef<number | null>(null);
  const desdeRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValor(target);
      return;
    }
    if (!Number.isFinite(target)) {
      setValor(0);
      return;
    }
    desdeRef.current = 0;
    inicioRef.current = null;
    let frame: number;

    function tick(t: number) {
      if (inicioRef.current === null) inicioRef.current = t;
      const progreso = Math.min((t - inicioRef.current) / durationMs, 1);
      // easeOutCubic — arranca rápido, llega suave.
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      setValor(desdeRef.current + (target - desdeRef.current) * suavizado);
      if (progreso < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return valor;
}
