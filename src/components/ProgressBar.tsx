export function ProgressBar({ label, value, target, formatValue }: {
  label: string;
  value: number;
  target: number;
  formatValue: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const overTarget = target > 0 && value >= target;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium">
          {formatValue(value)} {target > 0 && <span className="text-muted">/ {formatValue(target)}</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
        <div
          className={`h-full rounded-full ${overTarget ? "bg-accent-bright" : "bg-accent"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
