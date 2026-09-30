"use client";

import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/lib/useCountUp";

export function KpiCard({
  label,
  value,
  hint,
  delta,
  accentClassName,
  count,
  formatCount,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Percent change vs. previous period. Positive/negative color follows sign unless invertColor is set. */
  delta?: { pct: number; invertColor?: boolean };
  /** Optional background/border tint, e.g. "bg-[#FDE68A]/25 border-[#F5C542]/50". Overrides the default surface look. */
  accentClassName?: string;
  /** Si se da, el número sube animado desde 0 hasta acá (reemplaza `value` en pantalla). Deja `value` sin este prop para no animar. */
  count?: number;
  /** Cómo formatear `count` en cada cuadro de la animación — por defecto un entero con separador de miles. */
  formatCount?: (n: number) => string;
}) {
  // La tarjeta solo aparece y cuenta cuando entra en pantalla al hacer
  // scroll (no todas de una vez al cargar) — pedido de JM: "que vaya
  // cargando a medida que baje". Una sola vez, no se repite al volver a
  // pasar por ahí.
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animado = useCountUp(visible && count !== undefined ? count : 0, 1500);
  const mostrar =
    count !== undefined
      ? (formatCount ?? ((n: number) => Math.round(n).toLocaleString("es-CO")))(animado)
      : value;

  const isUp = delta && delta.pct >= 0;
  const isGood = delta ? (delta.invertColor ? !isUp : isUp) : true;

  return (
    <div
      ref={ref}
      className={`rounded-2xl border p-4 flex flex-col gap-1 ${visible ? "rise-in" : "opacity-0"} ${accentClassName ?? "glass glass-hover"}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground tabular-nums">{mostrar}</p>
      {delta && Number.isFinite(delta.pct) && (
        <p className={`text-xs ${isGood ? "text-accent-bright" : "text-danger"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(delta.pct * 100).toFixed(1)}% vs. mes anterior
        </p>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
