import { createClient } from "@/lib/supabase/server";
import { leerPendienteConToken } from "@/lib/meta/conexion";
import type { CuentaDisponible } from "@/lib/meta/client";
import { bodyValido } from "@/lib/api/validarBody";
import { confirmarConexionSchema } from "@/lib/meta/schemas";

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

  const validado = await bodyValido(request, confirmarConexionSchema);
  if (validado instanceof Response) return validado;
  const { pendienteId, indice } = validado.data;

  const pendiente = await leerPendienteConToken(supabase, pendienteId);

  if (!pendiente) {
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

  const registro = {
    cliente_nombre: pendiente.cliente_nombre,
    ad_account_id: cuenta.ad_account_id,
    page_id: cuenta.page_id,
    instagram_business_id: cuenta.instagram_business_id,
    access_token: pendiente.access_token,
    token_expira_en: pendiente.token_expira_en,
    conectado_por: user.id,
    actualizado_en: new Date().toISOString(),
  };

  // Ya no es un upsert: ON CONFLICT DO UPDATE necesita leer las columnas del
  // token (SELECT revocado). Además así, si esa cuenta de anuncios ya la
  // conectó OTRA organización, RLS no la deja ver ni pisar: el insert falla
  // por unicidad en vez de sobrescribir el token ajeno.
  const { data: existente } = await supabase
    .from("meta_conexiones")
    .select("id")
    .eq("ad_account_id", cuenta.ad_account_id)
    .maybeSingle();

  const { error: dbError } = existente
    ? await supabase.from("meta_conexiones").update(registro).eq("id", existente.id)
    : await supabase.from("meta_conexiones").insert(registro);

  if (dbError) {
    if (dbError.code === "23505") {
      return Response.json(
        { error: "Esa cuenta de anuncios ya está conectada en otra organización." },
        { status: 409 }
      );
    }
    return Response.json({ error: dbError.message }, { status: 500 });
  }

  // Ya no se necesita — se borra apenas se confirma.
  await supabase.from("meta_conexiones_pendientes").delete().eq("id", pendienteId);

  return Response.json({ ok: true, clienteNombre: pendiente.cliente_nombre });
}
