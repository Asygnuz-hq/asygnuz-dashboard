import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { fuentesAvanceSchema } from "@/lib/portal/schemas";
import { fetchProjects } from "@/lib/kaneo/client";
import { kaneoAsygnuz } from "@/lib/portal/avance";

type Params = { params: Promise<{ tenantId: string }> };

// GET: lo que se puede amarrar a este cliente (proyectos del Kaneo de
// ASYGNUZ y conexiones de Meta de ASYGNUZ) + lo que ya tiene amarrado.
// Nunca devuelve tokens: solo ids, nombres y qué trae cada conexión.
export async function GET(_request: Request, { params }: Params) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const [vinculadosKaneo, vinculadasMeta, conexiones] = await Promise.all([
    admin.from("portal_kaneo_proyectos").select("kaneo_project_id").eq("tenant_id", tenantId),
    admin.from("portal_meta_conexiones").select("conexion_id").eq("tenant_id", tenantId),
    admin
      .from("meta_conexiones")
      .select("id, cliente_nombre, ad_account_id, instagram_business_id, instagram_username")
      .order("cliente_nombre"),
  ]);

  let kaneoDisponibles: { id: string; nombre: string }[] = [];
  let errorKaneo: string | null = null;
  const kaneo = await kaneoAsygnuz();
  if (!kaneo) {
    errorKaneo = "Kaneo de ASYGNUZ no está configurado.";
  } else {
    try {
      kaneoDisponibles = (await fetchProjects(kaneo.config, kaneo.workspaceId))
        .filter((p) => !p.archivedAt)
        .map((p) => ({ id: p.id, nombre: p.name }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch {
      errorKaneo = "No se pudo leer la lista de proyectos de Kaneo.";
    }
  }

  return Response.json({
    kaneoDisponibles,
    kaneoVinculados: (vinculadosKaneo.data ?? []).map((f) => f.kaneo_project_id),
    errorKaneo,
    metaDisponibles: (conexiones.data ?? []).map((c) => ({
      id: c.id,
      nombre: c.cliente_nombre,
      anuncios: Boolean(c.ad_account_id),
      instagram: c.instagram_username ?? (c.instagram_business_id ? "conectado" : null),
    })),
    metaVinculadas: (vinculadasMeta.data ?? []).map((f) => f.conexion_id),
  });
}

// PUT: reemplaza la lista completa de fuentes del cliente.
export async function PUT(request: Request, { params }: Params) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, fuentesAvanceSchema);
  if (validado instanceof Response) return validado;
  const { kaneoProyectos, metaConexiones } = validado.data;

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("id", tenantId).maybeSingle();
  if (!tenant) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });

  const borrarKaneo = await admin.from("portal_kaneo_proyectos").delete().eq("tenant_id", tenantId);
  if (borrarKaneo.error) return Response.json({ error: borrarKaneo.error.message }, { status: 500 });
  if (kaneoProyectos.length > 0) {
    const { error } = await admin.from("portal_kaneo_proyectos").insert(
      kaneoProyectos.map((p) => ({ tenant_id: tenantId, kaneo_project_id: p.id, kaneo_project_nombre: p.nombre }))
    );
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  const borrarMeta = await admin.from("portal_meta_conexiones").delete().eq("tenant_id", tenantId);
  if (borrarMeta.error) return Response.json({ error: borrarMeta.error.message }, { status: 500 });
  if (metaConexiones.length > 0) {
    const { error } = await admin
      .from("portal_meta_conexiones")
      .insert(metaConexiones.map((id) => ({ tenant_id: tenantId, conexion_id: id })));
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
