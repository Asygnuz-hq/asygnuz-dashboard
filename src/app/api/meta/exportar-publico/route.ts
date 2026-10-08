import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInsights, fetchInstagramMedia, type MetaConexion } from "@/lib/meta/client";

// Endpoint PÚBLICO (sin login) para pegar en Google Sheets con
// =IMPORTDATA("...") — se protege con un token largo y no adivinable
// (export_token), no con la sesión del dashboard. Nunca expone el
// access_token real de Meta, solo métricas ya calculadas.
// ?token=<export_token de meta_conexiones>
//
// Rate limit (Kaneo #40): cada token inválido queda en
// export_intentos_fallidos con la IP; con MAX_FALLOS en VENTANA_MIN minutos
// esa IP recibe 429 sin tocar meta_conexiones. Se guarda en Supabase y no en
// memoria porque en Vercel cada invocación puede caer en una instancia
// distinta. El token se rota desde /api/meta/conexiones/[id]/export-token.
const MAX_FALLOS = 30;
const VENTANA_MIN = 15;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ipDe(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || request.headers.get("x-real-ip") || "desconocida";
}

export async function GET(request: Request) {
  // Ruta pública, sin sesión de usuario — la RLS de la tabla solo deja
  // pasar a "authenticated", así que aquí se usa el cliente admin
  // (service_role, ignora RLS) y la seguridad la da el token largo, no
  // Supabase Auth.
  const supabase = createAdminClient();
  const ip = ipDe(request);

  const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();
  const { count: fallos, error: errorConteo } = await supabase
    .from("export_intentos_fallidos")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("creado_en", desde);
  // Si no se puede contar (tabla sin crear, Supabase caído) se bloquea: un
  // límite que se apaga solo cuando falla no es un límite. Ojo: con head:true
  // un 404 de PostgREST no llena `error`, solo deja count en null.
  if (errorConteo || fallos === null || fallos >= MAX_FALLOS) {
    return new Response("Demasiados intentos. Intenta más tarde.", {
      status: 429,
      headers: { "Retry-After": String(VENTANA_MIN * 60) },
    });
  }

  const registrarFallo = async () => {
    await supabase.from("export_intentos_fallidos").insert({ ip });
  };

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token || !UUID.test(token)) {
    await registrarFallo();
    return new Response("Token inválido.", { status: 404 });
  }

  const { data: conexion, error } = await supabase
    .from("meta_conexiones")
    .select("*")
    .eq("export_token", token)
    .maybeSingle<MetaConexion>();

  if (error || !conexion) {
    await registrarFallo();
    return new Response("Token inválido.", { status: 404 });
  }

  const filas: string[][] = [];
  filas.push([`Métricas — ${conexion.cliente_nombre}`, new Date().toISOString().slice(0, 10)]);
  filas.push([]);

  if (conexion.ad_account_id) {
    try {
      const insights = await fetchInsights(conexion);
      filas.push(["Anuncios — últimos 30 días"]);
      filas.push(["Campaña", "Gasto", "Impresiones", "Alcance", "CPC", "CPM", "CTR"]);
      insights.forEach((r) => filas.push([r.campaign_name, r.spend, r.impressions, r.reach, r.cpc, r.cpm, r.ctr]));
      filas.push([]);
    } catch {
      // Si falla anuncios, igual se manda lo de Instagram.
    }
  }

  if (conexion.instagram_business_id && conexion.instagram_access_token) {
    try {
      const media = await fetchInstagramMedia(conexion);
      filas.push(["Instagram — publicaciones"]);
      filas.push(["Fecha", "Tipo", "Alcance", "Likes", "Comentarios", "Compartidos", "Guardados", "Reproducciones"]);
      media.forEach((m) =>
        filas.push([
          m.timestamp.slice(0, 10),
          m.media_product_type,
          String(m.metricas.reach ?? ""),
          String(m.metricas.likes ?? ""),
          String(m.metricas.comments ?? ""),
          String(m.metricas.shares ?? ""),
          String(m.metricas.saved ?? ""),
          String(m.metricas.views ?? ""),
        ])
      );
    } catch {
      // Si falla Instagram, igual se manda lo de anuncios.
    }
  }

  // Los nombres de campaña los controla quien administra la cuenta de
  // anuncios: una celda que empiece por = + - @ se ejecutaría como fórmula
  // en Google Sheets (=IMPORTDATA puede exfiltrar datos). Se antepone una
  // comilla simple para que se lea como texto.
  const neutralizar = (c: unknown) => {
    const t = String(c);
    return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  };
  const csv = filas
    .map((fila) => fila.map((c) => `"${neutralizar(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
