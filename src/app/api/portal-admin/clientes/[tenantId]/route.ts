import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarProyectoSchema } from "@/lib/portal/schemas";

// Ficha del cliente + su proyecto + lo que ya tiene cargado (enlaces,
// reuniones, archivos, contenido) — todo lo que necesita la pantalla de
// gestión en una sola llamada.
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const [tenant, proyecto, enlaces, reuniones, archivos, contenido, pilares] = await Promise.all([
    admin.from("tenants").select("id, nombre, slug, color_acento").eq("id", tenantId).maybeSingle(),
    admin.from("portal_proyecto").select("*").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("portal_enlaces").select("*").eq("tenant_id", tenantId).order("orden"),
    admin.from("portal_reuniones").select("*").eq("tenant_id", tenantId).order("fecha", { ascending: false }),
    admin.from("portal_archivos").select("*").eq("tenant_id", tenantId).order("subido_en", { ascending: false }),
    admin.from("portal_contenido").select("*").eq("tenant_id", tenantId).order("orden"),
    admin.from("portal_pilares").select("*").eq("tenant_id", tenantId).order("orden"),
  ]);

  if (!tenant.data) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });

  return Response.json({
    cliente: tenant.data,
    proyecto: proyecto.data,
    enlaces: enlaces.data ?? [],
    reuniones: reuniones.data ?? [],
    archivos: archivos.data ?? [],
    contenido: contenido.data ?? [],
    pilares: pilares.data ?? [],
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarProyectoSchema);
  if (validado instanceof Response) return validado;
  const { fechaInicio, fechaFin, tipoProyecto, descripcion, contactoNombre, contactoEmail, responsableNombre, responsableEmail, colorAcento } = validado.data;

  const admin = createAdminClient();
  const [{ error }, { error: errorTenant }] = await Promise.all([
    admin.from("portal_proyecto").upsert(
      {
        tenant_id: tenantId,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        tipo_proyecto: tipoProyecto || null,
        descripcion: descripcion || null,
        contacto_nombre: contactoNombre || null,
        contacto_email: contactoEmail || null,
        responsable_nombre: responsableNombre || null,
        responsable_email: responsableEmail || null,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    ),
    // Vive en tenants (marca del cliente), no en portal_proyecto.
    admin.from("tenants").update({ color_acento: colorAcento || null }).eq("id", tenantId),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (errorTenant) return Response.json({ error: errorTenant.message }, { status: 500 });
  return Response.json({ ok: true });
}
