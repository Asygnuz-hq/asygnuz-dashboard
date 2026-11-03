import { tokenDePortal } from "@/lib/bandeja/tokenAgente";
import { calcularAvance } from "@/lib/portal/avance";
import type { PeriodoMetricas } from "@/lib/portal/avanceTipos";

// GET /api/agente/avance?periodo=7d|30d|90d|mes
// Métricas de Instagram, parrilla y tareas de Kaneo del portal. Deja fuera a propósito
// pauta, metas y resumen, que incluyen inversión y presupuesto.
export async function GET(request: Request) {
  const auth = await tokenDePortal(request);
  if (auth instanceof Response) return auth;

  const periodoParam = new URL(request.url).searchParams.get("periodo");
  const periodo: PeriodoMetricas =
    periodoParam === "7d" || periodoParam === "90d" || periodoParam === "mes" ? periodoParam : "30d";

  const { generadoEn, cuenta, contenido, trabajo } = await calcularAvance(auth.tenantId, periodo);
  return Response.json({ generadoEn, periodo, cuenta, contenido, trabajo });
}
