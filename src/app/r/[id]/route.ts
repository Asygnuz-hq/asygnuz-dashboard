import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugUtm } from "@/lib/bandeja/texto";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Vistas previas y rastreadores que abren el link sin una persona detrás. Se guardan
// marcados y no cuentan en el reporte. "Instagram" no va aquí: es el navegador interno
// con el que la gente sí abre los links.
// shortcut: lista por user-agent, un bot que se disfrace de navegador pasa; revisar si el reporte vuelve a inflarse.
const BOT_REGEX =
  /bot|crawl|spider|facebookexternalhit|facebot|meta-external|slurp|preview|headless|curl|wget|python|axios|go-http|java\//i;

function esBot(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  const proposito = `${request.headers.get("purpose") ?? ""}${request.headers.get("sec-purpose") ?? ""}`;
  return !ua || BOT_REGEX.test(ua) || /prefetch|prerender/i.test(proposito);
}

// Agrega las UTMs del flujo a la URL de destino sin pisar las que ya traiga.
function conUtms(
  destino: string,
  utms: Record<string, string | null | undefined>
): string {
  try {
    const url = new URL(destino);
    for (const [clave, valor] of Object.entries(utms)) {
      if (valor && !url.searchParams.has(clave)) url.searchParams.set(clave, valor);
    }
    return url.toString();
  } catch {
    return destino;
  }
}

// Redirección interna para seguimiento de clics (/r/[id]).
// Pública, segura y sin datos personales en la URL.
// Registra el clic (contador atómico + una fila en ig_clics) y redirige a url_destino con UTMs.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const supabase = createAdminClient();
    const { data: link, error } = await supabase
      .from("ig_links_tracking")
      .select("id, url_destino, flujo_id, conexion_id, tenant_id, media_id, palabra_clave")
      .eq("id", id)
      .maybeSingle();

    if (error || !link || !link.url_destino) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    let nombreFlujo: string | null = null;
    if (link.flujo_id) {
      const { data: flujo } = await supabase
        .from("ig_flujos")
        .select("nombre")
        .eq("id", link.flujo_id)
        .maybeSingle();
      nombreFlujo = flujo?.nombre ?? null;
    }

    // Incremento atómico en base de datos sin condición de carrera + historial por clic.
    // Un fallo del historial no debe impedir la redirección. Los bots se guardan marcados
    // pero no suman al contador.
    const bot = esBot(request);
    await Promise.all([
      bot ? null : supabase.rpc("incrementar_clic_link", { p_link_id: id }),
      supabase.from("ig_clics").insert({
        link_id: link.id,
        flujo_id: link.flujo_id,
        conexion_id: link.conexion_id,
        tenant_id: link.tenant_id,
        media_id: link.media_id,
        es_bot: bot,
      }),
    ]);

    const destino = conUtms(link.url_destino, {
      utm_source: "instagram",
      utm_medium: "dm",
      utm_campaign: slugUtm(nombreFlujo ?? link.palabra_clave ?? "") || null,
      utm_content: link.media_id,
    });

    // Redirección temporal 307 para evitar que el navegador cachee permanentemente el destino
    return NextResponse.redirect(destino, 307);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
