import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { fetchInstagramMediaBasico, type MetaConexion } from "@/lib/meta/client";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;
const MAX_PUBLICACIONES = 20;

interface FilaReporte {
  flujo_id: string;
  flujo_nombre: string | null;
  media_id: string;
  disparos: number;
  dms_enviados: number;
  respuestas_publicas: number;
  errores: number;
  limites: number;
  clics: number;
  clics_unicos: number;
}

interface Totales {
  comentarios: number;
  disparos: number;
  dms: number;
  clicsUnicos: number;
}

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// Una persona = un DM = un link, así que los clics únicos nunca superan los DMs enviados.
function tasaClic(unicos: number, dms: number): string {
  return dms > 0 ? `${((unicos / dms) * 100).toFixed(1)}%` : "";
}

// GET /api/bandeja/reporte?conexion_id=...&desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&formato=csv]
// Reporte de una cuenta: tabla por flujo y publicación, serie diaria, embudo, leads y
// comparación con el periodo anterior de la misma duración. Las fechas son días de
// Colombia (UTC-5), ambas inclusivas. Con formato=csv responde solo la tabla como archivo.
export async function GET(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!conexionId) {
    return Response.json({ error: "Falta conexion_id" }, { status: 400 });
  }
  if (!desde || !hasta || !FECHA_REGEX.test(desde) || !FECHA_REGEX.test(hasta)) {
    return Response.json({ error: "desde y hasta deben ser YYYY-MM-DD" }, { status: 400 });
  }

  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const fin = new Date(new Date(`${hasta}T00:00:00-05:00`).getTime() + DIA_MS);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const rango = (a: Date, b: Date) => ({
    p_conexion_id: conexionId,
    p_desde: a.toISOString(),
    p_hasta: b.toISOString(),
  });

  const { data, error } = await supabase.rpc("bandeja_reporte", rango(inicio, fin));
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const filas = (data ?? []) as FilaReporte[];

  if (searchParams.get("formato") === "csv") {
    const encabezado = [
      "Flujo",
      "Publicación (media_id)",
      "Disparos",
      "DMs enviados",
      "Respuestas públicas",
      "Errores",
      "Límites alcanzados",
      "Clics totales",
      "Clics únicos",
      "Tasa de clic (únicos / DMs)",
    ];
    const lineas = filas.map((f) =>
      [
        f.flujo_nombre ?? "(flujo eliminado)",
        f.media_id || "Sin publicación",
        f.disparos,
        f.dms_enviados,
        f.respuestas_publicas,
        f.errores,
        f.limites,
        f.clics,
        f.clics_unicos,
        tasaClic(f.clics_unicos, f.dms_enviados),
      ]
        .map(celdaCsv)
        .join(",")
    );
    // BOM para que Excel abra bien las tildes
    const csv = "﻿" + [encabezado.map(celdaCsv).join(","), ...lineas].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-bandeja-${desde}_${hasta}.csv"`,
      },
    });
  }

  // Periodo anterior de la misma duración, para las variaciones de las tarjetas
  const inicioPrev = new Date(inicio.getTime() - (fin.getTime() - inicio.getTime()));

  const [dias, entrantes, leads, filasPrev, entrantesPrev, conexion] = await Promise.all([
    supabase.rpc("bandeja_reporte_dias", rango(inicio, fin)),
    supabase.rpc("bandeja_entrantes", rango(inicio, fin)),
    supabase.rpc("bandeja_leads", { ...rango(inicio, fin), p_limite: 200 }),
    supabase.rpc("bandeja_reporte", rango(inicioPrev, inicio)),
    supabase.rpc("bandeja_entrantes", rango(inicioPrev, inicio)),
    supabase.from("meta_conexiones").select("*").eq("id", conexionId).maybeSingle(),
  ]);

  const sumar = (f: FilaReporte[], comentarios: number): Totales => ({
    comentarios,
    disparos: f.reduce((s, x) => s + x.disparos, 0),
    dms: f.reduce((s, x) => s + x.dms_enviados, 0),
    clicsUnicos: f.reduce((s, x) => s + x.clics_unicos, 0),
  });
  const ent = (entrantes.data as { comentarios: number; mensajes: number }[] | null)?.[0];
  const entPrev = (entrantesPrev.data as { comentarios: number }[] | null)?.[0];

  // Texto, miniatura y enlace de las publicaciones que aparecen en la tabla (tope para no
  // lanzar decenas de llamadas a Meta). Si Meta falla, el reporte sale igual con los ids.
  const mediaIds = Array.from(new Set(filas.map((f) => f.media_id).filter(Boolean))).slice(
    0,
    MAX_PUBLICACIONES
  );
  const publicaciones = conexion.data
    ? await fetchInstagramMediaBasico(conexion.data as MetaConexion, mediaIds).catch(() => ({}))
    : {};

  return Response.json({
    filas,
    dias: dias.data ?? [],
    entrantes: { comentarios: ent?.comentarios ?? 0, mensajes: ent?.mensajes ?? 0 },
    leads: leads.data ?? [],
    publicaciones,
    actual: sumar(filas, ent?.comentarios ?? 0),
    anterior: sumar((filasPrev.data ?? []) as FilaReporte[], entPrev?.comentarios ?? 0),
  });
}
