"use server";

import { revalidatePath } from "next/cache";
import { addProjectMember, removeProjectMember } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser } from "@/lib/kaneo/tenant-config";

export async function agregarMiembroProyecto(projectId: string, userId: string) {
  const { config } = await getKaneoConfigForCurrentUser();
  await addProjectMember(config, projectId, userId);
  revalidatePath("/metricas/permisos");
}

export async function quitarMiembroProyecto(projectId: string, userId: string) {
  const { config } = await getKaneoConfigForCurrentUser();
  await removeProjectMember(config, projectId, userId);
  revalidatePath("/metricas/permisos");
}
