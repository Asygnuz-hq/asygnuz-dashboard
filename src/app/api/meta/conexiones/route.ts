import { createClient } from "@/lib/supabase/server";

// Lista los clientes ya conectados a Meta — nunca devuelve el access_token,
// solo lo necesario para mostrar la lista y elegir uno.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, ad_account_id, instagram_business_id, token_expira_en, actualizado_en")
    .order("cliente_nombre");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ conexiones: data });
}
