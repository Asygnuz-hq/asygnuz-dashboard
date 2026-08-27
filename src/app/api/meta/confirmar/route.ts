import { createClient } from "@/lib/supabase/server";
import type { CuentaDisponible } from "@/lib/meta/client";

// Guarda en firme la cuenta que el usuario eligió de la lista de
// pendientes, y borra el registro temporal.
// body: { pendienteId: string, indice: number }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { pendienteId, indice } = await request.json();
  if (!pendienteId || typeof indice !== "number") {
    return Response.json({ error: "Falta pendienteId o indice." }, { status: 400 });
  }

  const { data: pendiente, error: errorPendiente } = await supabase
    .from("meta_conexiones_pendientes")
    .select("cliente_nombre, access_token, token_expira_en, cuentas")
    .eq("id", pendienteId)
    .single();

  if (errorPendiente || !pendiente) {
    return Response.json(
      { error: "Esa conexión pendiente ya no existe o expiró. Vuelve a darle 'Conectar cliente'." },
      { status: 404 }
    );
  }

  const cuentas = pendiente.cuentas as CuentaDisponible[];
  const cuenta = cuentas[indice];
  if (!cuenta) {
    return Response.json({ error: "Esa cuenta ya no está en la lista." }, { status: 400 });
  }

  const { error: dbError } = await supabase.from("meta_conexiones").upsert(
    {
      cliente_nombre: pendiente.cliente_nombre,
      ad_account_id: cuenta.ad_account_id,
      page_id: cuenta.page_id,
      instagram_business_id: cuenta.instagram_business_id,
      access_token: pendiente.access_token,
      token_expira_en: pendiente.token_expira_en,
      conectado_por: user.id,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "ad_account_id" }
  );

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 });
  }

  // Ya no se necesita — se borra apenas se confirma.
  await supabase.from("meta_conexiones_pendientes").delete().eq("id", pendienteId);

  return Response.json({ ok: true, clienteNombre: pendiente.cliente_nombre });
}
