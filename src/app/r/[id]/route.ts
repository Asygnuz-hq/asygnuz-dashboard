import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Redirección interna para seguimiento de clics (/r/[id]).
// Pública, segura y sin datos personales en la URL.
// Registra el clic en ig_links_tracking de forma atómica y redirige a url_destino.
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
      .select("id, url_destino")
      .eq("id", id)
      .maybeSingle();

    if (error || !link || !link.url_destino) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Incremento atómico en base de datos sin condición de carrera
    await supabase.rpc("incrementar_clic_link", { p_link_id: id });

    // Redirección temporal 307 para evitar que el navegador cachee permanentemente el destino
    return NextResponse.redirect(link.url_destino, 307);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
