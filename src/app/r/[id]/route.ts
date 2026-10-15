import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Redirección interna para seguimiento de clics (/r/[id]).
// Pública, segura y sin datos personales en la URL.
// Registra el clic en ig_links_tracking y redirige al usuario a su URL destino.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const supabase = createAdminClient();
    const { data: link, error } = await supabase
      .from("ig_links_tracking")
      .select("id, url_destino, clics_count")
      .eq("id", id)
      .maybeSingle();

    if (error || !link || !link.url_destino) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Incrementar conteo de clics de forma asíncrona
    await supabase
      .from("ig_links_tracking")
      .update({ clics_count: (link.clics_count ?? 0) + 1 })
      .eq("id", link.id);

    // Redirección temporal 307 para evitar que el navegador cachee permanentemente el destino
    return NextResponse.redirect(link.url_destino, 307);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
