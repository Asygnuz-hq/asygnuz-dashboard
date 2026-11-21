import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const TIPOS_PERMITIDOS = new Set(["image/png", "image/svg+xml", "image/jpeg", "image/webp"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("logo");
  if (!(archivo instanceof File)) {
    return Response.json({ error: "Adjunta un archivo de imagen en el campo 'logo'." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return Response.json({ error: "El logo supera los 3 MB." }, { status: 400 });
  }
  if (archivo.type && !TIPOS_PERMITIDOS.has(archivo.type)) {
    return Response.json({ error: "Formato no soportado. Usa PNG, SVG, WEBP o JPG." }, { status: 400 });
  }

  const ext = (archivo.name.split(".").pop()?.toLowerCase() || "png").replace(/[^a-z0-9]/g, "");
  const ruta = `${tenantId}/logo.${ext || "png"}`;
  const buffer = Buffer.from(await archivo.arrayBuffer());

  const admin = createAdminClient();
  const { error: errorSubida } = await admin.storage
    .from("logos-tenants")
    .upload(ruta, buffer, {
      upsert: true,
      contentType: archivo.type || "image/png",
      cacheControl: "300",
    });

  if (errorSubida) {
    return Response.json({ error: `No se pudo subir el logo: ${errorSubida.message}` }, { status: 500 });
  }

  const { data } = admin.storage.from("logos-tenants").getPublicUrl(ruta);
  const logoUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: errorUpdate } = await admin
    .from("tenants")
    .update({ logo_url: logoUrl })
    .eq("id", tenantId);

  if (errorUpdate) {
    return Response.json({ error: errorUpdate.message }, { status: 500 });
  }

  return Response.json({ logoUrl });
}
