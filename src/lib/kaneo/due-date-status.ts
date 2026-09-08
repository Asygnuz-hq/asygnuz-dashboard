// Port directo de apps/web/src/lib/due-date-status.ts en el fork de Kaneo
// (mismo umbral de 3 días, mismo criterio "completada no puede estar
// atrasada") -- solo los nombres de color cambian a los tokens del dashboard.

export type DueDateStatus = "overdue" | "due-soon" | "far-future" | "no-due-date";

export function getDueDateStatus(dueDate: string | null, isCompleted = false): DueDateStatus {
  if (!dueDate) return "no-due-date";
  if (isCompleted) return "far-future";

  const diffInDays = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffInDays < 0) return "overdue";
  if (diffInDays <= 3) return "due-soon";
  return "far-future";
}

export const dueDateStatusColors: Record<DueDateStatus, string> = {
  overdue: "bg-danger/10 text-danger",
  "due-soon": "bg-warning/10 text-warning",
  "far-future": "bg-surface-alt text-muted",
  "no-due-date": "bg-surface-alt text-muted",
};
