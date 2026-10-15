import type { SupabaseClient } from "@supabase/supabase-js";

// Verificación en dos pasos (Kaneo #37). Punto único para decidir si una
// sesión puede pasar, tanto en el proxy (páginas) como en las rutas /api
// (que el proxy no cubre: su matcher excluye api/).
//
// - "ok":        sesión aal2, o usuario sin factor al que no se le exige el
//                alta (clientes del portal, o EXIGIR_ALTA_2FA=false).
// - "verificar": tiene factor pero la sesión sigue en aal1 (entró solo con
//                contraseña) -> debe poner el código en /login.
// - "enrolar":   no tiene ningún factor y se le exige -> /activar-2fa.
//
// Regla de JM (2026-10-14): el alta es obligatoria SOLO para el equipo
// (socios y empleados, tenant ASYGNUZ) y para usuarios aún sin asignar. Los
// clientes (Dra. Ingrid y demás tenants) entran solo con contraseña. Quien
// YA tiene factor siempre debe usarlo, sea del equipo o cliente. La base no
// se opone: mfa_ok() deja pasar a quien no tiene factor verificado.
export type EstadoMfa = "ok" | "verificar" | "enrolar";

export const EXIGIR_ALTA_2FA = process.env.EXIGIR_ALTA_2FA !== "false";

// Tenants donde el alta es obligatoria: el equipo y "sin asignar" (alguien
// recién creado todavía no vinculado a un cliente). Override por env.
const TENANT_ASYGNUZ = process.env.TENANT_ASYGNUZ_ID ?? "af1f801b-9da5-42e6-ba81-2920bd4f4c57";
const TENANT_SIN_ASIGNAR = "9e8f16a7-edcd-4ab1-85a1-12a33369eed0";

async function altaObligatoria(supabase: SupabaseClient): Promise<boolean> {
  if (!EXIGIR_ALTA_2FA) return false;
  const { data, error } = await supabase.rpc("current_tenant_id");
  // Si no se puede saber el tenant, se exige (nunca "todo permitido").
  if (error || !data) return true;
  return data === TENANT_ASYGNUZ || data === TENANT_SIN_ASIGNAR;
}

export async function estadoMfa(supabase: SupabaseClient): Promise<EstadoMfa> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Si no se puede leer el nivel, se trata como no verificado (nunca como
  // "todo permitido").
  if (error || !data) return "verificar";
  if (data.currentLevel === "aal2") return "ok";
  if (data.nextLevel === "aal2") return "verificar";
  return (await altaObligatoria(supabase)) ? "enrolar" : "ok";
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
