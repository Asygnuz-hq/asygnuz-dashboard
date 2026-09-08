import { Archive, CheckCircle2, Circle, CircleDashed, CircleDot, Search } from "lucide-react";

// Mismo set que apps/web/src/constants/column-icons.ts (DEFAULT_COLUMN_ICON_NAMES)
// para los slugs por defecto de Kaneo; cualquier otro cae al Circle/CheckCircle2
// genérico según isFinal, igual que el fallback real de getColumnIcon().
const ICONOS: Record<string, typeof Circle> = {
  "to-do": Circle,
  "in-progress": CircleDot,
  "in-review": Search,
  done: CheckCircle2,
  archived: Archive,
  planned: CircleDashed,
};

export function ColumnIcon({ slug, isFinal }: { slug: string; isFinal: boolean }) {
  const Icon = ICONOS[slug] ?? (isFinal ? CheckCircle2 : Circle);
  return <Icon className="h-4 w-4 text-muted" />;
}
