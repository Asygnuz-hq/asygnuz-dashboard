import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

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
}

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// GET /api/bandeja/reporte?conexion_id=...&desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&formato=csv]
// Reporte por flujo y publicación de una cuenta. Las fechas son días de Colombia (UTC-5),
// ambas inclusivas. Con formato=csv responde un archivo descargable.
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
  const { data, error } = await supabase.rpc("bandeja_reporte", {
    p_conexion_id: conexionId,
    p_desde: inicio.toISOString(),
    p_hasta: fin.toISOString(),
  });

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
      "Clics",
      "Tasa de clic",
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
        f.dms_enviados > 0 ? `${((f.clics / f.dms_enviados) * 100).toFixed(1)}%` : "",
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

  return Response.json({ filas });
}
