import { kaneoErrorResponse, listKaneoFuentes } from "@/lib/kaneo/tenant-config";

// Las fuentes de Kaneo que el cliente puede consultar (principal +
// adicionales). Sin credenciales -- solo id y nombre para el selector.
export async function GET() {
  try {
    return Response.json({ fuentes: await listKaneoFuentes() });
  } catch (err) {
    return kaneoErrorResponse(err, "Error listando las fuentes de Kaneo");
  }
}
