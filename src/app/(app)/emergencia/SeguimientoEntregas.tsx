"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CasoBase = {
  id: string;
  numero_caso: number | null;
  nombre: string;
  necesidad: string;
  zona: string | null;
  ubicacion_detalle: string | null;
  estado: string;
  creado_en: string;
};

type ItemCaso = {
  id: string;
  caso_id: string;
  item: string;
  entregado: boolean;
};

// Divide "cama, mercado y casa" en ["cama", "mercado", "casa"].
function dividirEnItems(texto: string): string[] {
  return texto
    .split(/,| y /gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

// Mismo criterio que la tabla de Casos: verde solo si ya está Cerrado, gris
// si está Cancelado, y para el resto el color sube de temperatura con los
// días sin resolver (naranja 0-2d, rojo 3-6d, rojo intenso 7d+).
function colorPorCaso(caso: CasoBase): string {
  if (caso.estado === "Cerrado") return "border-l-success";
  if (caso.estado === "Cancelado") return "border-l-border opacity-60";
  const dias = diasDesde(caso.creado_en);
  if (dias >= 7) return "border-l-danger-strong";
  if (dias >= 3) return "border-l-danger";
  return "border-l-warning";
}

export function SeguimientoEntregas({ casos }: { casos: CasoBase[] }) {
  const [items, setItems] = useState<ItemCaso[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoTexto, setNuevoTexto] = useState<Record<string, string>>({});
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [busqueda, setBusqueda] = useState("");

  const casoIds = useMemo(() => casos.map((c) => c.id), [casos]);

  const casosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q === "") return casos;
    return casos.filter(
      (c) =>
        String(c.numero_caso ?? "") === q ||
        c.nombre.toLowerCase().includes(q) ||
        (c.ubicacion_detalle ?? "").toLowerCase().includes(q)
    );
  }, [casos, busqueda]);

  async function cargar() {
    if (casoIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("items_caso_emergencia")
      .select("id, caso_id, item, entregado")
      .in("caso_id", casoIds)
      .order("creado_en");
    setItems((data as ItemCaso[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoIds.join(",")]);

  const itemsPorCaso = useMemo(() => {
    const map = new Map<string, ItemCaso[]>();
    for (const it of items) {
      const lista = map.get(it.caso_id) ?? [];
      lista.push(it);
      map.set(it.caso_id, lista);
    }
    return map;
  }, [items]);

  async function dividirNecesidad(caso: CasoBase) {
    const partes = dividirEnItems(caso.necesidad);
    if (partes.length === 0) return;
    const supabase = createClient();
    await supabase.from("items_caso_emergencia").insert(partes.map((item) => ({ caso_id: caso.id, item })));
    cargar();
  }

  async function agregarItem(casoId: string) {
    const texto = (nuevoTexto[casoId] ?? "").trim();
    if (!texto) return;
    const supabase = createClient();
    await supabase.from("items_caso_emergencia").insert({ caso_id: casoId, item: texto });
    setNuevoTexto((prev) => ({ ...prev, [casoId]: "" }));
    cargar();
  }

  async function toggleEntregado(item: ItemCaso) {
    const supabase = createClient();
    const entregado = !item.entregado;
    const itemsActualizados = items.map((it) => (it.id === item.id ? { ...it, entregado } : it));
    setItems(itemsActualizados);
    await supabase
      .from("items_caso_emergencia")
      .update({ entregado, entregado_en: entregado ? new Date().toISOString() : null })
      .eq("id", item.id);

    // Si con este cambio ya quedaron todos los ítems del caso entregados, se cierra solo.
    if (entregado) {
      const itemsCaso = itemsActualizados.filter((it) => it.caso_id === item.caso_id);
      const todosEntregados = itemsCaso.length > 0 && itemsCaso.every((it) => it.entregado);
      if (todosEntregados) {
        await supabase.from("casos_emergencia").update({ estado: "Cerrado" }).eq("id", item.caso_id);
      }
    }
  }

  async function eliminarItem(item: ItemCaso) {
    const supabase = createClient();
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    await supabase.from("items_caso_emergencia").delete().eq("id", item.id);
  }

  if (loading) return null;
  if (casos.length === 0) {
    return <p className="text-sm text-muted">Sin casos activos.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por N°, nombre o dirección"
        className="text-sm rounded-md border border-border bg-background px-3 py-1.5 w-56 mb-1"
      />
      {casosFiltrados.length === 0 && <p className="text-sm text-muted">Sin casos con esa búsqueda.</p>}
      {casosFiltrados.map((caso) => {
        const itemsCaso = itemsPorCaso.get(caso.id) ?? [];
        const entregados = itemsCaso.filter((i) => i.entregado).length;
        const abierto = expandido[caso.id] ?? false;

        return (
          <div key={caso.id} className={`rounded-lg border border-l-4 border-border bg-surface ${colorPorCaso(caso)}`}>
            <button
              type="button"
              onClick={() => setExpandido((prev) => ({ ...prev, [caso.id]: !abierto }))}
              className="w-full flex items-center justify-between gap-3 p-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {caso.numero_caso != null && <span className="text-muted">#{caso.numero_caso} </span>}
                  {caso.nombre}
                  <span className="text-muted font-normal"> · {diasDesde(caso.creado_en)}d</span>
                </p>
                <p className="text-xs text-muted truncate">
                  {caso.zona || "Sin zona"} · necesita: {caso.necesidad}
                </p>
              </div>
              <span
                className={`text-xs shrink-0 rounded-full px-2.5 py-1 ${
                  itemsCaso.length === 0
                    ? "bg-surface-alt"
                    : entregados === itemsCaso.length
                      ? "bg-success/10 text-success"
                      : entregados === 0
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                }`}
              >
                {itemsCaso.length === 0 ? "Sin ítems" : `${entregados}/${itemsCaso.length} entregados`}
              </span>
            </button>

            {abierto && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border pt-3">
                {itemsCaso.length === 0 && (
                  <button
                    type="button"
                    onClick={() => dividirNecesidad(caso)}
                    className="text-xs self-start rounded-md border border-accent text-accent px-2.5 py-1 hover:bg-accent/10"
                  >
                    Dividir automáticamente: {dividirEnItems(caso.necesidad).join(" · ")}
                  </button>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {itemsCaso.map((it) => (
                    <span
                      key={it.id}
                      className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border ${
                        it.entregado
                          ? "bg-success/10 border-success text-success line-through"
                          : "bg-danger/10 border-danger text-danger"
                      }`}
                    >
                      <button type="button" onClick={() => toggleEntregado(it)} className="no-underline">
                        {it.entregado ? "✓ " : ""}
                        {it.item}
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarItem(it)}
                        className="text-muted hover:text-danger no-underline"
                        aria-label={`Eliminar ${it.item}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nuevoTexto[caso.id] ?? ""}
                    onChange={(e) => setNuevoTexto((prev) => ({ ...prev, [caso.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") agregarItem(caso.id);
                    }}
                    placeholder="+ agregar ítem (ej. cobija)"
                    className="text-xs flex-1 rounded-md border border-border bg-background px-2.5 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => agregarItem(caso.id)}
                    className="text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-surface-alt"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
