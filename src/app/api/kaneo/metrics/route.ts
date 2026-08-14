import { calcularMetricas } from "@/lib/kaneo/metrics";

export async function GET() {
  const workspaceId = process.env.KANEO_WORKSPACE_ID;
  if (!workspaceId) {
    return Response.json(
      { error: "Falta KANEO_WORKSPACE_ID en las variables de entorno." },
      { status: 500 }
    );
  }

  try {
    const metricas = await calcularMetricas(workspaceId);
    return Response.json(metricas);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando Kaneo" },
      { status: 502 }
    );
  }
}
