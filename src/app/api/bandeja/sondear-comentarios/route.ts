import { NextResponse } from "next/server";
import { validarBearerSecret } from "@/lib/bandeja/procesar";
import { sondearComentarios } from "@/lib/bandeja/sondeo";

// POST /api/bandeja/sondear-comentarios
// Lo llama n8n cada pocos minutos (flujo "instagram-sondeo-comentarios") con
// Authorization: Bearer $BANDEJA_N8N_SECRET. Ver src/lib/bandeja/sondeo.ts.
export async function POST(request: Request) {
  if (!validarBearerSecret(request.headers.get("authorization"), process.env.BANDEJA_N8N_SECRET)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json(await sondearComentarios());
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[Bandeja] Error en sondeo de comentarios:", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
