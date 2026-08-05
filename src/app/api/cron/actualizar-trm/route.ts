import { fetchTrmOficial } from "@/lib/trmOficial";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel llama esta ruta una vez al día (ver vercel.json) con el header
// Authorization: Bearer $CRON_SECRET. Cualquier otra llamada se rechaza.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const trm = await fetchTrmOficial(hoy);
  if (trm === null) {
    return Response.json({ ok: false, motivo: "No se pudo leer la TRM oficial de hoy" }, { status: 502 });
  }

  const supabase = createAdminClient();

  await supabase.from("configuracion").update({ trm_actual: trm }).eq("id", 1);

  const { error: updateError } = await supabase
    .from("ingresos")
    .update({ trm_estimada_hoy: trm })
    .eq("estado", "Pendiente");

  if (updateError) {
    return Response.json({ ok: false, motivo: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, fecha: hoy, trm });
}
