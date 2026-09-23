import { fetchTrmOficial } from "@/lib/trmOficial";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);
  // La fecha se interpola en una consulta SoQL a datos.gov.co — solo se
  // acepta el formato exacto, nada más.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return Response.json({ error: "Fecha inválida (usa AAAA-MM-DD)." }, { status: 400 });
  }
  const valor = await fetchTrmOficial(fecha);
  return Response.json({ fecha, valor });
}
