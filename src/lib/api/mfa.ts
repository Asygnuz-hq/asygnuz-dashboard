import type { SupabaseClient } from "@supabase/supabase-js";

// Verificación en dos pasos (Kaneo #37). Punto único para decidir si una
// sesión puede pasar, tanto en el proxy (páginas) como en las rutas /api
// (que el proxy no cubre: su matcher excluye api/).
//
// - "ok":        sesión aal2, o usuario sin factor con el alta obligatoria
//                apagada (EXIGIR_ALTA_2FA=false).
// - "verificar": tiene factor pero la sesión sigue en aal1 (entró solo con
//                contraseña) -> debe poner el código en /login.
// - "enrolar":   no tiene ningún factor -> debe activarlo en /activar-2fa.
//
// El alta es obligatoria por defecto. EXIGIR_ALTA_2FA=false la apaga (p. ej.
// si un cliente del portal no puede activarla todavía); quien YA tiene
// factor siempre debe usarlo.
export type EstadoMfa = "ok" | "verificar" | "enrolar";

export const EXIGIR_ALTA_2FA = process.env.EXIGIR_ALTA_2FA !== "false";

export async function estadoMfa(supabase: SupabaseClient): Promise<EstadoMfa> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Si no se puede leer el nivel, se trata como no verificado (nunca como
  // "todo permitido").
  if (error || !data) return "verificar";
  if (data.currentLevel === "aal2") return "ok";
  if (data.nextLevel === "aal2") return "verificar";
  return EXIGIR_ALTA_2FA ? "enrolar" : "ok";
}

// Para rutas /api: null si puede seguir, o la Response 401 a devolver.
// Uso (después de comprobar que hay usuario):
//   const bloqueo = await bloqueoMfa(supabase);
//   if (bloqueo) return bloqueo;
export async function bloqueoMfa(supabase: SupabaseClient): Promise<Response | null> {
  const estado = await estadoMfa(supabase);
  if (estado === "ok") return null;
  return Response.json(
    {
      error:
        estado === "verificar"
          ? "Completa la verificación en dos pasos."
          : "Activa la verificación en dos pasos para continuar.",
    },
    { status: 401 }
  );
}
