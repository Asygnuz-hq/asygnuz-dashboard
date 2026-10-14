import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { calcularAvance } from "@/lib/portal/avance";

// Vista previa del Panel de Avance de un cliente, para quien gestiona portales.
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  return Response.json({ avance: await calcularAvance(tenantId) });
}
