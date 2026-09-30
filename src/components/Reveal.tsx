"use client";

import { useEffect, useRef, useState } from "react";

// Envuelve cualquier bloque para que aparezca (.rise-in) solo cuando entra
// en la pantalla al hacer scroll, en vez de animarse todo de una vez al
// cargar la página — así el dashboard "va cargando" de arriba hacia abajo
// a medida que uno baja, no todo junto. Se dispara una sola vez (no vuelve
// a jugar la animación si subes y bajas otra vez).
export function Reveal({
  children,
  className = "",
  indice = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Para escalonar varios Reveal que aparecen juntos en la misma fila/franja. */
  indice?: number;
}) {
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
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${visible ? "rise-in" : "opacity-0"} ${className}`}
      style={{ "--i": indice } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
