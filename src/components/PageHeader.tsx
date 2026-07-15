export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
