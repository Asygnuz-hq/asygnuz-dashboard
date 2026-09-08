import { ChevronDown, ChevronsUp, ChevronUp, CircleAlert, Minus } from "lucide-react";

// Mismos íconos que usa Kaneo (apps/web/src/lib/priority.tsx) para que una
// tarea se vea igual acá que en Kaneo -- solo los tokens de color cambian
// para los del dashboard (danger/warning/accent-bright/muted).
export function PriorityIcon({ priority }: { priority: string }) {
  switch (priority) {
    case "urgent":
      return <CircleAlert className="h-3 w-3 text-danger" />;
    case "high":
      return <ChevronsUp className="h-3 w-3 text-warning" />;
    case "medium":
      return <ChevronUp className="h-3 w-3 text-warning/80" />;
    case "low":
      return <ChevronDown className="h-3 w-3 text-accent-bright/85" />;
    default:
      return <Minus className="h-3 w-3 text-muted" />;
  }
}
