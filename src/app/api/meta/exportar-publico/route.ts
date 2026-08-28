import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInsights, fetchInstagramMedia, type MetaConexion } from "@/lib/meta/client";

// Endpoint PÚBLICO (sin login) para pegar en Google Sheets con
// =IMPORTDATA("...") — se protege con un token largo y no adivinable
// (export_token), no con la sesión del dashboard. Nunca expone el
// access_token real de Meta, solo métricas ya calculadas.
// ?token=<export_token de meta_conexiones>
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return new Response("Falta el token.", { status: 400 });
  }

  // Ruta pública, sin sesión de usuario — la RLS de la tabla solo deja
  // pasar a "authenticated", así que aquí se usa el cliente admin
  // (service_role, ignora RLS) y la seguridad la da el token largo, no
  // Supabase Auth.
  const supabase = createAdminClient();
  const { data: conexion, error } = await supabase
    .from("meta_conexiones")
    .select("*")
    .eq("export_token", token)
    .single<MetaConexion>();

  if (error || !conexion) {
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

  const csv = filas.map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
