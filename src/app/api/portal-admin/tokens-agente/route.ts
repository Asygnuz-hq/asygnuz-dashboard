import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";
import { generarTokenAgente } from "@/lib/bandeja/tokenAgente";

const SchemaCrearToken = z.object({
  nombre: z.string().min(1, "El nombre del token es requerido").max(60),
  // Sin tenantId = token de bandeja. Con tenantId = token MCP limitado a ese portal.
  tenantId: z.string().uuid("Portal inválido").optional(),
  puedeEscribir: z.boolean().default(false),
});

// GET /api/portal-admin/tokens-agente
// Lista los tokens existentes (sin revelar el secreto, solo el prefijo)
export async function GET() {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const supabase = createAdminClient();
  const { data: tokens, error } = await supabase
    .from("tokens_agente")
    .select("id, nombre, token_prefix, revocado, creado_en, ultimo_uso_en, tenant_id, puede_escribir")
    .order("creado_en", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ tokens: tokens ?? [] });
}

// POST /api/portal-admin/tokens-agente
// Genera un nuevo token personal para Claude Code o agentes locales.
// Devuelve el secreto sin hashear UNA SOLA VEZ.
export async function POST(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validacion = await bodyValido(request, SchemaCrearToken);
  if (validacion instanceof Response) return validacion;
  const { nombre, tenantId, puedeEscribir } = validacion.data;

  const { rawToken, prefix, hash } = generarTokenAgente();
  const supabase = createAdminClient();

  const { data: tokenGuardado, error } = await supabase
    .from("tokens_agente")
    .insert({
      user_id: auth.userId,
      nombre,
      token_hash: hash,
      token_prefix: prefix,
      revocado: false,
      tenant_id: tenantId ?? null,
      puede_escribir: Boolean(tenantId) && puedeEscribir,
    })
    .select("id, nombre, token_prefix, revocado, creado_en, tenant_id, puede_escribir")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Devolver el rawToken para que el usuario lo copie (única vez)
  return Response.json({
    token: tokenGuardado,
    token_secreto: rawToken,
  });
}
