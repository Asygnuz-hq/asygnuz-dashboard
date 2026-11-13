"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Cierra la sesión tras 15 días sin usar el dashboard (pedido de JM, 2026-11-13; antes eran 5 minutos).
// La última actividad se guarda en el navegador, así que cuenta aunque se cierre la pestaña o el equipo.
const LIMITE_INACTIVIDAD_MS = 15 * 24 * 60 * 60 * 1000;
const CLAVE = "asygnuz:ultima-actividad";
const GUARDAR_CADA_MS = 60 * 1000;
const EVENTOS_ACTIVIDAD = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

function leer(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function guardar(t: number) {
  try {
    localStorage.setItem(CLAVE, String(t));
  } catch {
    // Sin almacenamiento (modo privado): solo aplica el temporizador de la pestaña.
  }
}

export function IdleLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardadoRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    async function cerrarSesionPorInactividad() {
      try {
        localStorage.removeItem(CLAVE);
      } catch {}
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }

    // Al abrir: si la última actividad guardada tiene más de 15 días, se cierra la sesión.
    const ultima = leer();
    if (ultima !== null && Date.now() - ultima > LIMITE_INACTIVIDAD_MS) {
      cerrarSesionPorInactividad();
      return;
    }

    function reiniciarTemporizador() {
      const ahora = Date.now();
      if (ahora - guardadoRef.current > GUARDAR_CADA_MS) {
        guardadoRef.current = ahora;
        guardar(ahora);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(cerrarSesionPorInactividad, LIMITE_INACTIVIDAD_MS);
    }

    EVENTOS_ACTIVIDAD.forEach((evento) =>
      window.addEventListener(evento, reiniciarTemporizador, { passive: true })
    );
    reiniciarTemporizador();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      EVENTOS_ACTIVIDAD.forEach((evento) =>
        window.removeEventListener(evento, reiniciarTemporizador)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
