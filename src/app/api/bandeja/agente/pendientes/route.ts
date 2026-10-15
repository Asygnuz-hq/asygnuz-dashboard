import { createAdminClient } from "@/lib/supabase/admin";
import { validarTokenAgente } from "@/lib/bandeja/tokenAgente";
import { calcularVentana24h } from "@/lib/bandeja/texto";

// GET /api/bandeja/agente/pendientes
// Devuelve las conversaciones pendientes dentro de la ventana de 24h,
// con su historial de mensajes, datos de la cuenta y su guía de marca.
// Protegido con Bearer token de agente.
export async function GET(request: Request) {
  const auth = await validarTokenAgente(request);
  if (!auth.valido) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Traer conversaciones pendientes dentro de la ventana
  const { data: convs, error: convsErr } = await supabase
    .from("ig_conversaciones")
    .select(`
      id,
      conexion_id,
      tenant_id,
      ig_usuario_id,
      ig_usuario_nombre,
      ultimo_mensaje_usuario_en,
      ultimo_mensaje_texto,
      tipo_ultimo_evento,
      estado,
      creado_en
    `)
    .eq("estado", "pendiente")
    .gte("ultimo_mensaje_usuario_en", hace24h)
    .order("ultimo_mensaje_usuario_en", { ascending: false });

  if (convsErr) {
    return Response.json({ error: convsErr.message }, { status: 500 });
  }

  if (!convs || convs.length === 0) {
    return Response.json({ pendientes: [], total: 0 });
  }

  // Cargar conexiones vinculadas para guía de marca y nombres de cuenta
  const conexionIds = Array.from(new Set(convs.map((c) => c.conexion_id)));
  const { data: conexiones } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, instagram_username, guia_marca")
    .in("id", conexionIds);

  const conxMap = new Map((conexiones ?? []).map((c) => [c.id, c]));

  // Cargar historial de mensajes para cada conversación (últimos 8 mensajes)
  const convIds = convs.map((c) => c.id);
  const { data: mensajes } = await supabase
    .from("ig_mensajes")
    .select("conversacion_id, remitente, texto, enviado_por, creado_en")
    .in("conversacion_id", convIds)
    .order("creado_en", { ascending: true });

  const msgMap = new Map<string, typeof mensajes>();
  (mensajes ?? []).forEach((m) => {
    const list = msgMap.get(m.conversacion_id) ?? [];
    list.push(m);
    msgMap.set(m.conversacion_id, list);
  });

  const pendientes = convs.map((c) => {
    const conexion = conxMap.get(c.conexion_id);
    const ventana = calcularVentana24h(c.ultimo_mensaje_usuario_en);
    const hist = msgMap.get(c.id) ?? [];

    return {
      conversacion_id: c.id,
      cliente_nombre: conexion?.cliente_nombre ?? "Cliente",
      instagram_username: conexion?.instagram_username ?? null,
      ig_usuario_id: c.ig_usuario_id,
      ig_usuario_nombre: c.ig_usuario_nombre,
      ultimo_mensaje_usuario_en: c.ultimo_mensaje_usuario_en,
      ultimo_mensaje_texto: c.ultimo_mensaje_texto,
      ventana_24h: {
        horas_restantes: ventana.horasRestantes,
        minutos_restantes: ventana.minutosRestantes,
        etiqueta: ventana.etiqueta,
      },
      guia_marca: conexion?.guia_marca ?? "Tono profesional, cercano y claro. Invitar a agendar si aplica.",
      historial: hist.slice(-8).map((m) => ({
        remitente: m.remitente,
        texto: m.texto,
        enviado_por: m.enviado_por,
        creado_en: m.creado_en,
      })),
    };
  });

  return Response.json({
    total: pendientes.length,
    pendientes,
  });
}
