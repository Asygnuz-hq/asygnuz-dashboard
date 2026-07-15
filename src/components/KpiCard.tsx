export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
