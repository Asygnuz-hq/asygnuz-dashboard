import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { calcularVentana24h, determinarCanalRespuesta } from "@/lib/bandeja/texto";

// GET /api/bandeja/conversaciones
// Consulta conversaciones de Instagram con filtros de cuenta, estado y tipo.
export async function GET(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  const tenantId = searchParams.get("tenant_id");
  const estado = searchParams.get("estado"); // 'pendiente' | 'respondida' | 'archivada' | 'todas'
  const tipo = searchParams.get("tipo"); // 'todos' | 'message' | 'comment'
  const busqueda = searchParams.get("q")?.toLowerCase().trim();

  const supabase = createAdminClient();
  let query = supabase
    .from("ig_conversaciones")
    .select(`
      id,
      conexion_id,
      tenant_id,
      ig_usuario_id,
      ig_usuario_nombre,
      ultimo_mensaje_usuario_en,
      ultimo_dm_usuario_en,
      ha_enviado_dm,
      comment_id_origen,
      respuesta_privada_enviada,
      ultimo_mensaje_texto,
      tipo_ultimo_evento,
      estado,
      flujo_origen,
      creado_en,
      actualizado_en
    `)
    .order("ultimo_mensaje_usuario_en", { ascending: false });

  if (conexionId) query = query.eq("conexion_id", conexionId);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (estado && estado !== "todas") query = query.eq("estado", estado);
  if (tipo && tipo !== "todos") query = query.eq("tipo_ultimo_evento", tipo);

  const { data: convs, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Cargar conexiones vinculadas para saber nombre de cliente y usuario de Instagram
  const conexionIds = Array.from(new Set((convs ?? []).map((c) => c.conexion_id)));
  const { data: conexiones } = conexionIds.length > 0
    ? await supabase.from("meta_conexiones").select("id, cliente_nombre, instagram_username").in("id", conexionIds)
    : { data: [] };

  const conxMap = new Map((conexiones ?? []).map((c) => [c.id, c]));

  let resultado = (convs ?? []).map((c) => {
    const canalInfo = determinarCanalRespuesta(c);
    // Para DMs normales la ventana de 24h cuenta solo desde el último mensaje directo del usuario
    const fechaRefVentana = c.ha_enviado_dm && c.ultimo_dm_usuario_en ? c.ultimo_dm_usuario_en : c.ultimo_mensaje_usuario_en;
    const ventana = calcularVentana24h(fechaRefVentana);
    const conx = conxMap.get(c.conexion_id);
    return {
      ...c,
      horas_restantes: ventana.horasRestantes,
      minutos_restantes: ventana.minutosRestantes,
      vencida: canalInfo.canal === "solo_publica" ? true : ventana.vencida,
      ventana_etiqueta: ventana.etiqueta,
      canal_respuesta: canalInfo.canal,
      canal_motivo: canalInfo.motivo,
      cliente_nombre: conx?.cliente_nombre ?? "Cliente",
      instagram_username: conx?.instagram_username ?? null,
    };
  });

  if (busqueda) {
    resultado = resultado.filter(
      (c) =>
        c.ig_usuario_nombre?.toLowerCase().includes(busqueda) ||
        c.ultimo_mensaje_texto?.toLowerCase().includes(busqueda) ||
        c.cliente_nombre.toLowerCase().includes(busqueda)
    );
  }

  return Response.json({ conversaciones: resultado });
}
