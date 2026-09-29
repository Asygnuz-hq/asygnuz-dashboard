import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";

const TAMANO_MAXIMO = 20 * 1024 * 1024; // 20 MB

// Sube un archivo AL PORTAL DE ESE CLIENTE (bucket privado, RLS por
// carpeta = tenant_id) — multipart, no JSON, así que no pasa por
// bodyValido/zod. El nombre del archivo en Storage es un id random, nunca
// el nombre original: evita choques y cualquier truco con el nombre del
// archivo (path traversal, caracteres raros) en la ruta de Storage.
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return Response.json({ error: "El archivo pesa más de 20 MB." }, { status: 400 });
  }

  const extension = archivo.name.includes(".") ? archivo.name.split(".").pop() : null;
  const rutaStorage = `${tenantId}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const admin = createAdminClient();
  const { error: errorSubida } = await admin.storage
    .from("portal-archivos")
    .upload(rutaStorage, archivo, { contentType: archivo.type || undefined });
  if (errorSubida) return Response.json({ error: errorSubida.message }, { status: 500 });

  const { data, error } = await admin
    .from("portal_archivos")
    .insert({
      tenant_id: tenantId,
      nombre: archivo.name.slice(0, 200),
      storage_path: rutaStorage,
      tamano_bytes: archivo.size,
    })
    .select()
    .single();

  if (error) {
    await admin.storage.from("portal-archivos").remove([rutaStorage]);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ archivo: data });
}
