"use client";

import { useEffect, useState } from "react";

// Gestión (solo /portal-admin): qué proyectos de Kaneo y qué conexiones de
// Meta alimentan el Panel de Avance de este cliente. Las conexiones de Meta
// siguen siendo de ASYGNUZ — esto solo las comparte con el cliente.

type Fuentes = {
  kaneoDisponibles: { id: string; nombre: string }[];
  kaneoVinculados: string[];
  errorKaneo: string | null;
  metaDisponibles: { id: string; nombre: string; anuncios: boolean; instagram: string | null }[];
  metaVinculadas: string[];
  presupuestoMensualPauta?: number | null;
};

export function FuentesAvance({ tenantId }: { tenantId: string }) {
  const [fuentes, setFuentes] = useState<Fuentes | null>(null);
  const [kaneo, setKaneo] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<Set<string>>(new Set());
  const [presupuesto, setPresupuesto] = useState<string>("");
  const [estado, setEstado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch(`/api/portal-admin/clientes/${tenantId}/fuentes`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        setFuentes(data);
        setKaneo(new Set(data.kaneoVinculados));
        setMeta(new Set(data.metaVinculadas));
        setPresupuesto(data.presupuestoMensualPauta ? String(data.presupuestoMensualPauta) : "");
      })
      .catch((err: unknown) => setEstado(err instanceof Error ? err.message : "No se pudieron cargar las fuentes."));
  }, [tenantId]);

  function alternar(conjunto: Set<string>, id: string, set: (s: Set<string>) => void) {
    const nuevo = new Set(conjunto);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    set(nuevo);
  }

  async function guardar() {
    if (!fuentes) return;
    setGuardando(true);
    setEstado(null);
    const presNum = presupuesto.trim() ? Number(presupuesto.replace(/[^\d]/g, "")) : null;
    const res = await fetch(`/api/portal-admin/clientes/${tenantId}/fuentes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kaneoProyectos: fuentes.kaneoDisponibles.filter((p) => kaneo.has(p.id)),
        metaConexiones: [...meta],
        presupuestoMensualPauta: Number.isFinite(presNum) && presNum !== null ? presNum : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    setEstado(res.ok ? "Fuentes guardadas. El cliente ya ve su avance con estos datos." : data.error || "No se pudo guardar.");
  }

  if (!fuentes) return <p className="text-sm text-muted">{estado ?? "Cargando fuentes..."}</p>;

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Proyecto(s) en Kaneo — “lo que hemos hecho”</legend>
        {fuentes.errorKaneo && <p className="text-xs text-muted">{fuentes.errorKaneo}</p>}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {fuentes.kaneoDisponibles.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={kaneo.has(p.id)} onChange={() => alternar(kaneo, p.id, setKaneo)} />
              {p.nombre}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">¿No está el proyecto del cliente? Créalo en Kaneo y recarga esta página.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Cuentas de Meta — pauta e Instagram</legend>
        {fuentes.metaDisponibles.length === 0 ? (
          <p className="text-xs text-muted">No hay cuentas de Meta conectadas. Conéctalas desde Marketing.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {fuentes.metaDisponibles.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={meta.has(c.id)} onChange={() => alternar(meta, c.id, setMeta)} />
                <span>{c.nombre}</span>
                <span className="text-xs text-muted">
                  {[c.anuncios ? "anuncios" : null, c.instagram ? `Instagram ${c.instagram === "conectado" ? "" : "@" + c.instagram}`.trim() : null]
                    .filter(Boolean)
                    .join(" · ") || "sin datos"}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Presupuesto de pauta del mes (COP)</legend>
        <p className="text-xs text-muted">Para calcular la barra de ritmo de presupuesto (gastado vs planeado) en el Portal del cliente.</p>
        <div className="max-w-xs">
          <input
            type="number"
            min="0"
            step="100000"
            placeholder="Ej. 4500000"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            className="w-full"
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-md bg-accent text-accent-foreground font-medium py-2 px-4 disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Guardar fuentes"}
        </button>
        {estado && <span className="text-sm text-muted">{estado}</span>}
      </div>
    </div>
  );
}
