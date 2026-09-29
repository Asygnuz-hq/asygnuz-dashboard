import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { vincularUsuarioSchema } from "@/lib/portal/schemas";

// El usuario del cliente se crea a mano en Supabase Studio (Authentication →
// Users → Add user) — igual que ya se hace para los tenants del SaaS. Esto
// solo hace el segundo paso: mover ese correo al tenant del cliente. Usa la
// función asignar_usuario_a_tenant (revocada para authenticated/anon, pero
// no para service_role) en vez de tocar profiles/auth.users a mano.
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, vincularUsuarioSchema);
  if (validado instanceof Response) return validado;
  const { email, rol } = validado.data;

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
  if (!tenant) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });

  const { data, error } = await admin.rpc("asignar_usuario_a_tenant", {
    p_email: email,
    p_slug: tenant.slug,
    p_rol: rol,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, mensaje: data });
}
