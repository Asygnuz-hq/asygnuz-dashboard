export function KpiCard({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Percent change vs. previous period. Positive/negative color follows sign unless invertColor is set. */
  delta?: { pct: number; invertColor?: boolean };
}) {
  const isUp = delta && delta.pct >= 0;
  const isGood = delta ? (delta.invertColor ? !isUp : isUp) : true;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {delta && Number.isFinite(delta.pct) && (
        <p className={`text-xs ${isGood ? "text-accent-bright" : "text-danger"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(delta.pct * 100).toFixed(1)}% vs. mes anterior
        </p>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
