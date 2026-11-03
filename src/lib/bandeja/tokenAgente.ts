import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { denegarEnBandeja, denegarEnPortal, tokenVencido } from "@/lib/agente/permisos";

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

type TokenValido = {
  valido: true;
  id: string;
  userId: string;
  nombre: string;
  tenant_id: string | null;
  puede_escribir: boolean;
};

async function buscarToken(request: Request): Promise<TokenValido | { valido: false; error: string; status: number }> {
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
    .select("id, user_id, nombre, revocado, tenant_id, puede_escribir, expira_en")
    .eq("token_hash", hash)
    .maybeSingle();

  if (tokenErr || !tokenRow || tokenRow.revocado) {
    return { valido: false, error: "Token inválido o revocado", status: 401 };
  }

  if (tokenVencido(tokenRow.expira_en)) {
    return { valido: false, error: "Token vencido: genera uno nuevo en /portal-admin", status: 401 };
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

  return {
    valido: true,
    id: tokenRow.id,
    userId: tokenRow.user_id,
    nombre: tokenRow.nombre,
    tenant_id: tokenRow.tenant_id,
    puede_escribir: tokenRow.puede_escribir,
  };
}

export async function validarTokenAgente(request: Request): Promise<
  { valido: true; userId: string; nombre: string } | { valido: false; error: string; status: number }
> {
  const token = await buscarToken(request);
  if (!token.valido) return token;

  const denegado = denegarEnBandeja(token);
  if (denegado) return { valido: false, ...denegado };

  return { valido: true, userId: token.userId, nombre: token.nombre };
}

// Para /api/agente/*: el tenant sale SIEMPRE del token, nunca de la URL ni del body.
export async function tokenDePortal(
  request: Request,
  requiereEscritura = false
): Promise<{ tokenId: string; tenantId: string; puedeEscribir: boolean } | Response> {
  const token = await buscarToken(request);
  if (!token.valido) return Response.json({ error: token.error }, { status: token.status });

  const denegado = denegarEnPortal(token, requiereEscritura);
  if (denegado) return Response.json({ error: denegado.error }, { status: denegado.status });

  return { tokenId: token.id, tenantId: token.tenant_id!, puedeEscribir: token.puede_escribir };
}

export async function auditarAgente(
  auth: { tokenId: string; tenantId: string },
  accion: string,
  recursoId: string,
  cambios: Record<string, unknown>
) {
  const { error } = await createAdminClient().from("agente_auditoria").insert({
    token_id: auth.tokenId,
    tenant_id: auth.tenantId,
    accion,
    recurso_id: recursoId,
    cambios,
  });
  if (error) console.error("No se pudo registrar la auditoría del agente:", error.message);
}
