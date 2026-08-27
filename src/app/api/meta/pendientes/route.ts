import { createClient } from "@/lib/supabase/server";

// Devuelve la lista de cuentas/portafolios disponibles para una conexión
// pendiente (justo después del login de Facebook, antes de confirmar cuál
// guardar). Nunca devuelve el access_token al navegador.
// ?id=<id de meta_conexiones_pendientes>
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Falta el id de la conexión pendiente." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meta_conexiones_pendientes")
    .select("cliente_nombre, cuentas")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "Esa conexión pendiente ya no existe o expiró. Vuelve a darle 'Conectar cliente'." },
      { status: 404 }
    );
  }

  return Response.json(data);
}
