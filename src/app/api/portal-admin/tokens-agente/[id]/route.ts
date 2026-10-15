import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";

// DELETE /api/portal-admin/tokens-agente/[id]
// Revoca el token de forma permanente
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Falta ID del token" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tokens_agente")
    .update({ revocado: true })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mensaje: "Token revocado correctamente" });
}
