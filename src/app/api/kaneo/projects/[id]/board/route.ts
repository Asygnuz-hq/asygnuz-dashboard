import { fetchProjectTasks, getColumns } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const [columns, tasks] = await Promise.all([
      getColumns(config, id),
      fetchProjectTasks(config, id),
    ]);
    return Response.json({ columns, tasks });
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo el tablero de Kaneo");
  }
}
