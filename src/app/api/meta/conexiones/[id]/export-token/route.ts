import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bloqueoMfa } from "@/lib/api/mfa";

// export_token de una conexión de Meta (Kaneo #40) — el secreto de
// /api/meta/exportar-publico (Google Sheets). Ya no viaja en la lista de
// conexiones: el rol `authenticated` no tiene SELECT sobre esa columna
// (schema-seguridad-sprint5-export.sql) y solo un admin del tenant lo pide.
//   GET  -> { token } actual
//   POST -> genera uno nuevo (el enlace viejo deja de funcionar) y lo devuelve

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

// null si quien llama es admin y la conexión es de su tenant; si no, la
// Response de error a devolver.
async function autorizar(id: string): Promise<Response | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  if (!UUID.test(id)) {
    return Response.json({ error: "Conexión no encontrada." }, { status: 404 });
  }

  const { data: perfil } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    return Response.json({ error: "Solo un administrador puede ver o rotar este enlace." }, { status: 403 });
  }

  // Con la sesión del usuario (RLS por tenant): si no la ve, no es suya.
  const { data: visible } = await supabase.from("meta_conexiones").select("id").eq("id", id).maybeSingle();
  if (!visible) {
    return Response.json({ error: "Conexión no encontrada." }, { status: 404 });
  }
  return null;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const error = await autorizar(id);
  if (error) return error;

  const { data } = await createAdminClient()
    .from("meta_conexiones")
    .select("export_token")
    .eq("id", id)
    .single<{ export_token: string | null }>();
  return Response.json({ token: data?.export_token ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const error = await autorizar(id);
  if (error) return error;

  const token = crypto.randomUUID();
  const { error: errorUpdate } = await createAdminClient()
    .from("meta_conexiones")
    .update({ export_token: token })
    .eq("id", id);
  if (errorUpdate) {
    return Response.json({ error: "No se pudo rotar el enlace." }, { status: 500 });
  }
  return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
