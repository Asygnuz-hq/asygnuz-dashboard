"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LIMITE_INACTIVIDAD_MS = 5 * 60 * 1000;
const EVENTOS_ACTIVIDAD = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function IdleLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function cerrarSesionPorInactividad() {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }

    function reiniciarTemporizador() {
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
