import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { bodyValido } from "@/lib/api/validarBody";
import { desconectarConexionSchema } from "@/lib/meta/schemas";

// Borra una conexión guardada (ej. se conectó la cuenta equivocada).
// body: { id: string }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const validado = await bodyValido(request, desconectarConexionSchema);
  if (validado instanceof Response) return validado;
  const { id } = validado.data;

  const { error } = await supabase.from("meta_conexiones").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
