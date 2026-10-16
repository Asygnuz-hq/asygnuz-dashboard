import { createAdminClient } from "@/lib/supabase/admin";
import { procesarEventoWebhook, type ResultadoProcesamiento } from "./procesar";

// Sondeo de comentarios de Instagram (alternativa a los webhooks de `comments`).
//
// Meta solo envía webhooks de comentarios a apps en modo Live y con Advanced
// Access (App Review + verificación del negocio). Mientras ASYGNUZ no lo tenga,
// n8n llama cada pocos minutos a /api/bandeja/sondear-comentarios, que lee los
// comentarios recientes de las publicaciones recientes de cada cuenta con flujos
// activos y los pasa por el MISMO motor que los webhooks (procesarEventoWebhook).
//
// Nunca responde dos veces:
//  - Cada comentario se registra en ig_eventos con su id de Meta como
//    meta_evento_id (único). El motor descarta lo ya registrado, venga del sondeo
//    o, el día de mañana, de un webhook real (mismo id).
//  - Solo se consideran comentarios de los últimos VENTANA_MIN minutos: al
//    activar el sondeo no se responden comentarios viejos.
//  - Los comentarios de la propia cuenta se ignoran en el motor.

const GRAPH_INSTAGRAM_URL = "https://graph.instagram.com/v21.0";
const VENTANA_MIN = 15; // el sondeo corre cada 2-3 min; el traslape lo absorbe la deduplicación
const MAX_PUBLICACIONES = 8;
const DIAS_PUBLICACIONES = 30;

type ComentarioGraph = {
  id: string;
  text?: string;
  timestamp: string;
  from?: { id: string; username?: string };
};

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_INSTAGRAM_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body as T;
}

export type ResultadoSondeo = {
  cuentas: number;
  publicacionesRevisadas: number;
  comentariosNuevos: number;
  resultado: Pick<ResultadoProcesamiento, "eventosProcesados" | "duplicados" | "descartados">;
  errores: string[];
};

export async function sondearComentarios(): Promise<ResultadoSondeo> {
  const supabase = createAdminClient();
  const errores: string[] = [];
  const corte = Date.now() - VENTANA_MIN * 60 * 1000;
  const desdePublicacion = Date.now() - DIAS_PUBLICACIONES * 86400000;

  // Solo cuentas con al menos un flujo activo: sin flujos no hay nada que responder.
  const { data: flujos } = await supabase.from("ig_flujos").select("conexion_id").eq("activo", true);
  const conexionIds = Array.from(new Set((flujos ?? []).map((f) => f.conexion_id as string)));

  const vacio: ResultadoSondeo = {
    cuentas: 0,
    publicacionesRevisadas: 0,
    comentariosNuevos: 0,
    resultado: { eventosProcesados: 0, duplicados: 0, descartados: 0 },
    errores,
  };
  if (conexionIds.length === 0) return vacio;

  const { data: conexiones } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, instagram_business_id, instagram_user_id, instagram_username, instagram_access_token")
    .in("id", conexionIds);

  const entradas: unknown[] = [];
  let publicacionesRevisadas = 0;
  let comentariosNuevos = 0;

  await Promise.all(
    (conexiones ?? []).map(async (c) => {
      if (!c.instagram_business_id || !c.instagram_access_token) return;
      const igId = String(c.instagram_business_id);
      const token = c.instagram_access_token as string;
      try {
        const media = await graph<{ data: { id: string; timestamp: string }[] }>(`/${igId}/media`, {
          fields: "id,timestamp",
          limit: String(MAX_PUBLICACIONES),
          access_token: token,
        });
        const recientes = (media.data ?? []).filter((m) => new Date(m.timestamp).getTime() >= desdePublicacion);
        publicacionesRevisadas += recientes.length;

        const cambios: unknown[] = [];
        await Promise.all(
          recientes.map(async (m) => {
            const comentarios = await graph<{ data: ComentarioGraph[] }>(`/${m.id}/comments`, {
              fields: "id,text,timestamp,from",
              limit: "50",
              access_token: token,
            }).catch((err: unknown) => {
              errores.push(`${c.cliente_nombre}: comentarios de ${m.id}: ${err instanceof Error ? err.message : err}`);
              return { data: [] as ComentarioGraph[] };
            });
            for (const com of comentarios.data ?? []) {
              if (new Date(com.timestamp).getTime() < corte) continue;
              if (!com.from?.id) continue;
              if (com.from.id === igId || com.from.id === c.instagram_user_id) continue;
              if (com.from.username && com.from.username === c.instagram_username) continue;
              comentariosNuevos++;
              // Misma forma que el webhook de Meta (field "comments"), para
              // reutilizar el motor y su deduplicación por id de comentario.
              cambios.push({
                field: "comments",
                value: {
                  id: com.id,
                  text: com.text ?? "",
                  from: { id: com.from.id, username: com.from.username },
                  media: { id: m.id },
                },
              });
            }
          })
        );
        if (cambios.length > 0) entradas.push({ id: igId, time: Math.floor(Date.now() / 1000), changes: cambios });
      } catch (err) {
        errores.push(`${c.cliente_nombre}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  if (entradas.length === 0) {
    return { ...vacio, cuentas: conexiones?.length ?? 0, publicacionesRevisadas };
  }

  const res = await procesarEventoWebhook(JSON.stringify({ object: "instagram", entry: entradas }));
  return {
    cuentas: conexiones?.length ?? 0,
    publicacionesRevisadas,
    comentariosNuevos,
    resultado: {
      eventosProcesados: res.eventosProcesados,
      duplicados: res.duplicados,
      descartados: res.descartados,
    },
    errores: [...errores, ...res.errores],
  };
}
