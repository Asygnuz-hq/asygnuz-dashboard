import { PageHeader } from "@/components/PageHeader";
import {
  fetchProjects,
  fetchProjectMembers,
  fetchWorkspaceMembers,
  frenteDeProyecto,
  type KaneoProjectMember,
  type KaneoWorkspaceMember,
} from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser } from "@/lib/kaneo/tenant-config";
import { PermisosClient, type ProyectoConMiembros } from "./PermisosClient";

export default async function PermisosPage() {
  const { config, workspaceId } = await getKaneoConfigForCurrentUser();

  const [todosLosProyectos, miembrosWorkspace] = await Promise.all([
    fetchProjects(config, workspaceId),
    fetchWorkspaceMembers(config, workspaceId),
  ]);

  const clasificados = todosLosProyectos
    .filter((p) => !p.archivedAt)
    .map((p) => ({ proyecto: p, frente: frenteDeProyecto(p.name) }))
    .filter(
      (x): x is { proyecto: (typeof todosLosProyectos)[number]; frente: "Growth" | "Software" } =>
        x.frente !== null
    );

  let endpointDisponible = true;
  const proyectos: ProyectoConMiembros[] = await Promise.all(
    clasificados.map(async ({ proyecto, frente }) => {
      let miembros: KaneoProjectMember[] = [];
      try {
        miembros = await fetchProjectMembers(config, proyecto.id);
      } catch {
        endpointDisponible = false;
      }
      return { proyecto, frente, workspaceId, miembros };
    })
  );

  const miembrosPorWorkspace: Record<string, KaneoWorkspaceMember[]> = {
    [workspaceId]: miembrosWorkspace,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permisos por proyecto"
        subtitle="Restringe qué proyectos ve cada persona dentro de Growth y Software."
      />

      {!endpointDisponible && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">No se pudo consultar los miembros de uno o más proyectos.</p>
          <p className="text-muted mt-1">
            El endpoint de Kaneo respondió con error para al menos un proyecto — puede ser un
            problema temporal del servidor. Recarga en unos minutos; si persiste, revisa los logs
            de la VPS.
          </p>
        </div>
      )}

      <PermisosClient proyectos={proyectos} miembrosPorWorkspace={miembrosPorWorkspace} deshabilitado={!endpointDisponible} />
    </div>
  );
}
