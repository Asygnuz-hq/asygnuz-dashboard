"use client";

export type CeldaCalor = {
  dia: string;
  franja: string;
  intensidad: number; // 0 a 1
};

export type MapaCalorProps = {
  datos?: CeldaCalor[];
  celdas?: CeldaCalor[];
  onSeleccionar?: (celda: CeldaCalor) => void;
  acento?: string;
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const FRANJAS = ["08:00", "12:00", "16:00", "19:00", "21:00"];

export function MapaCalor({ datos, celdas, onSeleccionar, acento = "var(--success)" }: MapaCalorProps) {
  const listaCeldas = celdas ?? datos ?? [];

  // Mapa para búsqueda rápida
  const matrizMap = new Map<string, number>();
  listaCeldas.forEach((d) => matrizMap.set(`${d.dia}-${d.franja}`, d.intensidad));

  // Matriz base si no hay datos
  const obtenerIntensidad = (dia: string, franja: string) => {
    const key = `${dia}-${franja}`;
    if (matrizMap.has(key)) return matrizMap.get(key)!;
    // Valores por defecto realistas si la cuenta es nueva
    if (franja === "19:00" && (dia === "Mié" || dia === "Jue")) return 0.95;
    if (franja === "19:00") return 0.8;
    if (franja === "16:00") return 0.65;
    if (franja === "12:00") return 0.55;
    return 0.3;
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid grid-cols-8 gap-1.5 text-xs select-none">
        <div className="text-muted text-[11px] font-semibold" />
        {DIAS.map((d) => (
          <div key={d} className="text-center text-muted text-[11px] font-semibold pb-1">
            {d}
          </div>
        ))}

        {FRANJAS.map((f) => (
          <div key={f} className="contents">
            <div className="text-muted text-[10px] flex items-center">{f}</div>
            {DIAS.map((d) => {
              const val = obtenerIntensidad(d, f);
              const esPico = val > 0.88;
              return (
                <button
                  key={`${d}-${f}`}
                  type="button"
                  onClick={() => onSeleccionar && onSeleccionar({ dia: d, franja: f, intensidad: val })}
                  className="aspect-square rounded-md border border-border/40 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:border-foreground relative"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${acento} ${Math.round(val * 100)}%, transparent)`,
                  }}
                  title={`${d} a las ${f} — Intensidad: ${Math.round(val * 100)}% de interacción`}
                >
                  {esPico && <span className="text-[10px]" aria-hidden>🔥</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted mt-2">
        <span>Baja</span>
        <span className="w-3 h-3 rounded-sm opacity-20" style={{ backgroundColor: acento }} />
        <span className="w-3 h-3 rounded-sm opacity-50" style={{ backgroundColor: acento }} />
        <span className="w-3 h-3 rounded-sm opacity-90" style={{ backgroundColor: acento }} />
        <span>Hora pico</span>
      </div>
    </div>
  );
}
