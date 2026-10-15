import { NextResponse } from "next/server";
import {
  validarBearerSecret,
  validarFirmaMeta,
  procesarEventoWebhook,
} from "@/lib/bandeja/procesar";

// POST /api/bandeja/procesar-evento
// Endpoint seguro que recibe los webhooks crudos reenviados desde n8n.
// Protegido con BANDEJA_N8N_SECRET en tiempo constante y validación de firma HMAC SHA-256.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const n8nSecret = process.env.BANDEJA_N8N_SECRET;

  // 1. Validar secreto de comunicación n8n -> Dashboard en tiempo constante
  if (!validarBearerSecret(authHeader, n8nSecret)) {
    return NextResponse.json(
      { error: "No autorizado. Token de n8n inválido o ausente." },
      { status: 401 }
    );
  }

  // 2. Obtener cuerpo crudo sin parsear para integridad de firma
  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json({ error: "Cuerpo de solicitud vacío" }, { status: 400 });
  }

  // 3. Validar firma criptográfica X-Hub-Signature-256 de Meta. Siempre:
  // sin META_INSTAGRAM_APP_SECRET (que el OAuth de Instagram ya exige) la
  // firma no valida y el evento se rechaza (falla cerrada).
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;

  if (!validarFirmaMeta(rawBody, signatureHeader, appSecret)) {
    return NextResponse.json(
      { error: "Firma HMAC SHA256 de Meta inválida o ausente (falla cerrada)." },
      { status: 401 }
    );
  }

  // 4. Procesar el evento con la lógica completa del dashboard
  try {
    const resultado = await procesarEventoWebhook(rawBody, {
      "x-hub-signature-256": signatureHeader ?? undefined,
    });

    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Bandeja] Error inesperado en procesar-evento:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
