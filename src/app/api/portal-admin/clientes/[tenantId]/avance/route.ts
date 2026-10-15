import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { calcularAvance } from "@/lib/portal/avance";

import type { PeriodoMetricas } from "@/lib/portal/avanceTipos";

// Vista previa del Panel de Avance de un cliente, para quien gestiona portales.
export async function GET(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const periodoParam = searchParams.get("periodo");
  const periodo: PeriodoMetricas =
    periodoParam === "7d" || periodoParam === "90d" || periodoParam === "mes" ? periodoParam : "30d";

  return Response.json({ avance: await calcularAvance(tenantId, periodo) });
}
