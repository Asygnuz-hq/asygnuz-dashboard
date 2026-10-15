import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function generarTokenAgente(): { rawToken: string; prefix: string; hash: string } {
  const bytes = crypto.randomBytes(32).toString("hex");
  const rawToken = `asg_ag_${bytes}`;
  const prefix = rawToken.slice(0, 14) + "…";
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, prefix, hash };
}

export function hashearToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export async function validarTokenAgente(request: Request): Promise<
  { valido: true; userId: string; nombre: string } | { valido: false; error: string; status: number }
> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valido: false, error: "Falta encabezado Authorization: Bearer <token>", status: 401 };
  }

  const rawToken = authHeader.replace("Bearer ", "").trim();
  if (!rawToken) {
    return { valido: false, error: "Token vacío", status: 401 };
  }

  const hash = hashearToken(rawToken);
  const supabase = createAdminClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("tokens_agente")
    .select("id, user_id, nombre, revocado")
    .eq("token_hash", hash)
    .maybeSingle();

  if (tokenErr || !tokenRow || tokenRow.revocado) {
    return { valido: false, error: "Token inválido o revocado", status: 401 };
  }

  // Verificar que el usuario del token tenga permiso de gestionar portales
  const { data: profile } = await supabase
    .from("profiles")
    .select("gestiona_portales")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (!profile?.gestiona_portales) {
    return { valido: false, error: "El usuario del token no tiene permiso gestiona_portales", status: 403 };
  }

  // Actualizar último uso de forma asíncrona
  await supabase
    .from("tokens_agente")
    .update({ ultimo_uso_en: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return { valido: true, userId: tokenRow.user_id, nombre: tokenRow.nombre };
}
