"use server";

import { revalidatePath } from "next/cache";
import { addProjectMember, removeProjectMember } from "@/lib/kaneo/client";

export async function agregarMiembroProyecto(projectId: string, userId: string) {
  await addProjectMember(projectId, userId);
  revalidatePath("/metricas/permisos");
}

export async function quitarMiembroProyecto(projectId: string, userId: string) {
  await removeProjectMember(projectId, userId);
  revalidatePath("/metricas/permisos");
}
