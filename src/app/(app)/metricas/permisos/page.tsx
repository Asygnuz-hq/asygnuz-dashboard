import { PageHeader } from "@/components/PageHeader";
import {
  fetchProjects,
  fetchProjectMembers,
  fetchWorkspaceMembers,
  type KaneoProject,
  type KaneoProjectMember,
  type KaneoWorkspaceMember,
} from "@/lib/kaneo/client";
import { PermisosClient, type ProyectoConMiembros } from "./PermisosClient";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

async function cargarFrente(
  workspaceId: string,
  frente: "Growth" | "Software"
): Promise<{ proyectos: ProyectoConMiembros[]; miembrosWorkspace: KaneoWorkspaceMember[]; endpointDisponible: boolean }> {
  const [proyectos, miembrosWorkspace] = await Promise.all([
    fetchProjects(workspaceId),
    fetchWorkspaceMembers(workspaceId),
  ]);
  const activos = proyectos.filter((p: KaneoProject) => !p.archivedAt);

  let endpointDisponible = true;
  const proyectosConMiembros = await Promise.all(
    activos.map(async (p) => {
      let miembros: KaneoProjectMember[] = [];
      try {
        miembros = await fetchProjectMembers(p.id);
      } catch {
        endpointDisponible = false;
      }
      return { proyecto: p, frente, workspaceId, miembros };
    })
  );

  return { proyectos: proyectosConMiembros, miembrosWorkspace, endpointDisponible };
}

export default async function PermisosPage() {
  const [growth, software] = await Promise.all([
    cargarFrente(env("KANEO_WORKSPACE_ID_GROWTH"), "Growth"),
    cargarFrente(env("KANEO_WORKSPACE_ID_SOFTWARE"), "Software"),
  ]);

  const endpointDisponible = growth.endpointDisponible && software.endpointDisponible;
  const proyectos = [...growth.proyectos, ...software.proyectos];
  const miembrosPorWorkspace: Record<string, KaneoWorkspaceMember[]> = {
    [growth.proyectos[0]?.workspaceId ?? "growth"]: growth.miembrosWorkspace,
    [software.proyectos[0]?.workspaceId ?? "software"]: software.miembrosWorkspace,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permisos por proyecto"
        subtitle="Restringe qué proyectos ve cada persona dentro de Growth y Software."
      />

      {!endpointDisponible && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Todavía no disponible en producción.</p>
          <p className="text-muted mt-1">
            Esta pantalla ya está lista, pero el backend que la soporta (tabla y endpoints de
            miembros por proyecto) está en un fork de Kaneo pendiente de revisión de un developer
            antes de desplegarse — es código de autenticación, así que no se activa sin que alguien
            más lo revise primero. Ver{" "}
            <a
              href="https://github.com/Asygnuz-hq/kaneo/pull/1"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              PR #1
            </a>
            . En cuanto esté desplegado, esta pantalla funciona sin cambios.
          </p>
        </div>
      )}

      <PermisosClient proyectos={proyectos} miembrosPorWorkspace={miembrosPorWorkspace} deshabilitado={!endpointDisponible} />
    </div>
  );
}
