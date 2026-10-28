import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";

const SchemaBoton = z.object({
  titulo: z.string().min(1, "El título del botón no puede estar vacío"),
  url: z
    .string()
    .url("Debe ser una URL válida")
    .refine((u) => u.startsWith("https://"), {
      message: "La URL de destino debe ser segura (https://)",
    }),
});

const SchemaCrearFlujo = z.object({
  nombre: z.string().min(1, "El nombre del flujo es obligatorio").max(100),
  conexion_id: z.string().uuid("ID de conexión inválido"),
  tenant_id: z.string().uuid().nullable().optional(),
  palabras_clave: z.array(z.string().min(1)).min(1, "Debe incluir al menos una palabra clave"),
  aplica_a: z.string().default("todas"),
  respuesta_privada: z.string().min(1, "La respuesta privada es obligatoria"),
  respuesta_publica: z.array(z.string()).default([]),
  botones: z.array(SchemaBoton).default([]),
  activo: z.boolean().default(true),
});

// GET /api/bandeja/flujos
// Lista los flujos con sus estadísticas agregadas de los últimos 30 días
export async function GET(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  const tenantId = searchParams.get("tenant_id");

  const supabase = createAdminClient();
  let query = supabase.from("ig_flujos").select("*").order("creado_en", { ascending: false });

  if (conexionId) query = query.eq("conexion_id", conexionId);
  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data: flujos, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Cargar estadísticas de los últimos 30 días para cada flujo desde ig_acciones
  const flujoIds = (flujos ?? []).map((f) => f.id);
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: acciones } = flujoIds.length > 0
    ? await supabase
        .from("ig_acciones")
        .select("flujo_id, resultado")
        .in("flujo_id", flujoIds)
        .gte("ejecutado_en", hace30dias)
    : { data: [] };

  const statsMap = new Map<string, { total: number; exito: number; error: number }>();
  (acciones ?? []).forEach((a) => {
    if (!a.flujo_id) return;
    const curr = statsMap.get(a.flujo_id) ?? { total: 0, exito: 0, error: 0 };
    curr.total += 1;
    if (a.resultado === "exito") curr.exito += 1;
    if (a.resultado === "error" || a.resultado === "limite_alcanzado") curr.error += 1;
    statsMap.set(a.flujo_id, curr);
  });

  // Cargar links de tracking creados para cada flujo
  const { data: links } = flujoIds.length > 0
    ? await supabase
        .from("ig_links_tracking")
        .select("id, flujo_id, url_destino, titulo, clics_count, por_envio")
        .in("flujo_id", flujoIds)
        // Los links por envío solo importan si tuvieron clics (se suman al botón base).
        .or("por_envio.eq.false,clics_count.gt.0")
    : { data: [] };

  // Un renglón por botón: los clics de los links por envío se suman al link base.
  type LinkFlujo = {
    id: string;
    flujo_id: string | null;
    url_destino: string;
    titulo: string | null;
    clics_count: number;
    por_envio: boolean;
  };
  const linksMap = new Map<string, LinkFlujo[]>();
  (links ?? [])
    .filter((l) => !l.por_envio)
    .forEach((l) => {
      if (!l.flujo_id) return;
      const curr = linksMap.get(l.flujo_id) ?? [];
      curr.push({ ...l });
      linksMap.set(l.flujo_id, curr);
    });
  (links ?? [])
    .filter((l) => l.por_envio)
    .forEach((l) => {
      const base = l.flujo_id
        ? linksMap.get(l.flujo_id)?.find((b) => b.url_destino === l.url_destino)
        : undefined;
      if (base) base.clics_count += l.clics_count;
    });

  const flujosConStats = (flujos ?? []).map((f) => {
    const s = statsMap.get(f.id) ?? { total: 0, exito: 0, error: 0 };
    return {
      ...f,
      total_disparado: s.total,
      total_respuestas: s.exito,
      total_errores: s.error,
      links_tracking: linksMap.get(f.id) ?? [],
    };
  });

  // También obtener configuración de bienvenida para la conexión si aplica
  let bienvenida = null;
  if (conexionId) {
    const { data: bData } = await supabase
      .from("ig_bienvenida")
      .select("*")
      .eq("conexion_id", conexionId)
      .maybeSingle();
    bienvenida = bData;
  }

  // Dominio propio para los links de los DMs de esta cuenta
  let dominioLinks: string | null = null;
  if (conexionId) {
    const { data: cData } = await supabase
      .from("meta_conexiones")
      .select("dominio_links")
      .eq("id", conexionId)
      .maybeSingle();
    dominioLinks = cData?.dominio_links ?? null;
  }

  return Response.json({ flujos: flujosConStats, bienvenida, dominio_links: dominioLinks });
}

// POST /api/bandeja/flujos
// Crea un nuevo flujo de respuesta automática y genera links de rastreo para sus botones
export async function POST(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validacion = await bodyValido(request, SchemaCrearFlujo);
  if (validacion instanceof Response) return validacion;
  const data = validacion.data;

  const supabase = createAdminClient();

  // Limpiar y normalizar palabras clave
  const palabrasLimpias = Array.from(
    new Set(data.palabras_clave.map((p) => p.trim()).filter((p) => p.length > 0))
  );

  const { data: nuevoFlujo, error: flujoErr } = await supabase
    .from("ig_flujos")
    .insert({
      nombre: data.nombre,
      conexion_id: data.conexion_id,
      tenant_id: data.tenant_id ?? null,
      palabras_clave: palabrasLimpias,
      aplica_a: data.aplica_a,
      respuesta_privada: data.respuesta_privada,
      respuesta_publica: data.respuesta_publica,
      botones: data.botones,
      activo: data.activo,
    })
    .select()
    .single();

  if (flujoErr || !nuevoFlujo) {
    return Response.json({ error: flujoErr?.message ?? "Error creando flujo" }, { status: 500 });
  }

  // Crear registros en ig_links_tracking para los botones con URL
  if (data.botones && data.botones.length > 0) {
    const linksAInsertar = data.botones.map((b) => ({
      flujo_id: nuevoFlujo.id,
      conexion_id: nuevoFlujo.conexion_id,
      tenant_id: nuevoFlujo.tenant_id,
      url_destino: b.url,
      titulo: b.titulo,
    }));
    await supabase.from("ig_links_tracking").insert(linksAInsertar);
  }

  return Response.json({ ok: true, flujo: nuevoFlujo }, { status: 201 });
}
