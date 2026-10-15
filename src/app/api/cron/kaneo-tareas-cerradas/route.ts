import { cronAutorizado } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { kaneoAsygnuz } from "@/lib/portal/avance";
import { fetchProjectTasks } from "@/lib/kaneo/client";

// Cron diario (ver vercel.json) para registrar tareas completadas en Kaneo.
// Dado que la API de Kaneo no guarda la fecha en que una tarea pasó a "done",
// este cron almacena en kaneo_tareas_cerradas el instante de cierre
// para calcular % de entregas a tiempo y métricas semanales históricas.
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return new Response("No autorizado", { status: 401 });
  }

  const admin = createAdminClient();
  const kaneo = await kaneoAsygnuz();
  if (!kaneo) {
    return Response.json({ ok: false, error: "Kaneo no configurado" }, { status: 500 });
  }

  // Proyectos amarrados a algún portal de cliente
  const { data: proyectos, error: errProyectos } = await admin
    .from("portal_kaneo_proyectos")
    .select("kaneo_project_id");

  if (errProyectos) {
    return Response.json({ ok: false, error: errProyectos.message }, { status: 500 });
  }

  const projectIds = Array.from(new Set((proyectos ?? []).map((p) => p.kaneo_project_id)));
  let insertadasTotal = 0;

  for (const projId of projectIds) {
    try {
      const tareas = await fetchProjectTasks(kaneo.config, projId);
      const hechas = tareas.filter((t) => t.status === "done");
      if (hechas.length === 0) continue;

      // Consultar cuáles ya están registradas
      const { data: yaRegistradas } = await admin
        .from("kaneo_tareas_cerradas")
        .select("task_id")
        .in("task_id", hechas.map((t) => t.id));

      const setRegistradas = new Set((yaRegistradas ?? []).map((r) => r.task_id));
      const pendientesDeRegistrar = hechas.filter((t) => !setRegistradas.has(t.id));

      if (pendientesDeRegistrar.length > 0) {
        const filas = pendientesDeRegistrar.map((t) => ({
          task_id: t.id,
          project_id: projId,
          cerrada_en: new Date().toISOString(),
          fecha_limite: t.dueDate ?? null,
        }));

        await admin.from("kaneo_tareas_cerradas").insert(filas);
        insertadasTotal += filas.length;
      }
    } catch (err) {
      console.error(`Error procesando tareas de proyecto ${projId}:`, err);
    }
  }

  return Response.json({
    ok: true,
    proyectosRevisados: projectIds.length,
    tareasCerradasRegistradas: insertadasTotal,
  });
}
