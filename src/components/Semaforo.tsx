type SemaforoNivel = "verde" | "amarillo" | "rojo";

const STYLES: Record<SemaforoNivel, { dot: string; label: string; text: string }> = {
  verde: { dot: "bg-emerald-500", label: "Mes saludable", text: "text-emerald-400" },
  amarillo: { dot: "bg-amber-500", label: "Mes ajustado", text: "text-amber-400" },
  rojo: { dot: "bg-danger", label: "Mes en alerta", text: "text-danger" },
};

export function calcularSemaforo(margenPct: number, metaMargenPct: number): SemaforoNivel {
  if (metaMargenPct > 0) {
    if (margenPct >= metaMargenPct) return "verde";
    if (margenPct >= metaMargenPct * 0.7) return "amarillo";
    return "rojo";
  }
  if (margenPct >= 0.25) return "verde";
  if (margenPct >= 0.1) return "amarillo";
  return "rojo";
}

export function Semaforo({ nivel }: { nivel: SemaforoNivel }) {
  const s = STYLES[nivel];
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
    </div>
  );
}
