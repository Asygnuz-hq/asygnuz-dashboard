export function KpiCard({
  label,
  value,
  hint,
  delta,
  accentClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Percent change vs. previous period. Positive/negative color follows sign unless invertColor is set. */
  delta?: { pct: number; invertColor?: boolean };
  /** Optional background/border tint, e.g. "bg-[#FDE68A]/25 border-[#F5C542]/50". Overrides the default surface look. */
  accentClassName?: string;
}) {
  const isUp = delta && delta.pct >= 0;
  const isGood = delta ? (delta.invertColor ? !isUp : isUp) : true;

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${accentClassName ?? "glass glass-hover"}`}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
      {delta && Number.isFinite(delta.pct) && (
        <p className={`text-xs ${isGood ? "text-accent-bright" : "text-danger"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(delta.pct * 100).toFixed(1)}% vs. mes anterior
        </p>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
