import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarProyectoSchema } from "@/lib/portal/schemas";

// Ficha del cliente + su proyecto + lo que ya tiene cargado (enlaces,
// reuniones, archivos, contenido, pilares, hojas) — todo lo que necesita la
// pantalla de gestión y la vista previa en una sola llamada.
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const [tenant, proyecto, enlaces, reuniones, archivos, contenido, pilares, hojas] = await Promise.all([
    admin
      .from("tenants")
      .select("id, nombre, slug, subdominio, logo_url, color_acento, tagline_portal, splash_habilitado")
      .eq("id", tenantId)
      .maybeSingle(),
    admin.from("portal_proyecto").select("*").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("portal_enlaces").select("*").eq("tenant_id", tenantId).order("orden"),
    admin.from("portal_reuniones").select("*").eq("tenant_id", tenantId).order("fecha", { ascending: false }),
    admin.from("portal_archivos").select("*").eq("tenant_id", tenantId).order("subido_en", { ascending: false }),
    admin.from("portal_contenido").select("*").eq("tenant_id", tenantId).order("orden"),
    admin.from("portal_pilares").select("*").eq("tenant_id", tenantId).order("orden"),
    admin.from("portal_hojas").select("*").eq("tenant_id", tenantId).order("orden"),
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
    hojas: hojas.data ?? [],
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarProyectoSchema);
  if (validado instanceof Response) return validado;
  const {
    fechaInicio,
    fechaFin,
    tipoProyecto,
    descripcion,
    contactoNombre,
    contactoEmail,
    responsableNombre,
    responsableEmail,
    colorAcento,
    subdominio,
    taglinePortal,
    splashHabilitado,
    logoUrl,
  } = validado.data;

  const cambiosTenant: Record<string, unknown> = {
    color_acento: colorAcento || null,
  };
  if (subdominio !== undefined) cambiosTenant.subdominio = subdominio || null;
  if (taglinePortal !== undefined) cambiosTenant.tagline_portal = taglinePortal || null;
  if (splashHabilitado !== undefined) cambiosTenant.splash_habilitado = splashHabilitado;
  if (logoUrl !== undefined) cambiosTenant.logo_url = logoUrl || null;

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
    admin.from("tenants").update(cambiosTenant).eq("id", tenantId),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (errorTenant) {
    const duplicado = errorTenant.code === "23505";
    return Response.json(
      { error: duplicado ? `El subdominio "${subdominio}" ya está en uso.` : errorTenant.message },
      { status: duplicado ? 409 : 500 }
    );
  }
  return Response.json({ ok: true });
}
