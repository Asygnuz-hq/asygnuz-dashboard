import { createClient } from "@/lib/supabase/server";

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

  const { id } = await request.json();
  if (!id) {
    return Response.json({ error: "Falta el id de la conexión." }, { status: 400 });
  }

  const { error } = await supabase.from("meta_conexiones").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
