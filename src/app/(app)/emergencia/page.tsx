"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { SeguimientoEntregas } from "./SeguimientoEntregas";

const ESTADOS = ["Consiguiendo", "Por entregar", "Conseguido", "Cerrado", "Cancelado", "Por confirmar"] as const;
const ESTADOS_ACTIVOS = new Set(["Consiguiendo", "Por entregar", "Conseguido", "Por confirmar"]);

const columns: ColumnDef[] = [
  { key: "numero_caso", label: "N°", type: "number" },
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "necesidad", label: "Necesidad", type: "text", required: true },
  { key: "prioridad", label: "Prioridad", type: "select", options: ["Urgente", "Intermedia", "Baja"] },
  { key: "estado", label: "Estado", type: "select", options: [...ESTADOS], defaultValue: "Consiguiendo" },
  { key: "dias", label: "Días", type: "readonly-days-since", sinceKey: "creado_en" },
  { key: "zona", label: "Zona / vereda", type: "text" },
  { key: "ciudad", label: "Ciudad", type: "text" },
  { key: "ubicacion_detalle", label: "Dirección", type: "text" },
  { key: "encargado", label: "Encargado", type: "text" },
  { key: "telefono", label: "Teléfono", type: "text" },
  { key: "fuente", label: "Fuente", type: "text", defaultValue: "Manual" },
  { key: "notas", label: "Notas", type: "text" },
];

const columnasInventario: ColumnDef[] = [
  { key: "item", label: "Item", type: "text", required: true },
  { key: "cantidad", label: "Cantidad", type: "number", required: true, defaultValue: 0 },
  { key: "unidad", label: "Unidad", type: "text", defaultValue: "unidades" },
  { key: "notas", label: "Notas", type: "text" },
];

type Caso = {
  id: string;
  numero_caso: number | null;
  nombre: string;
  necesidad: string;
  prioridad: "Urgente" | "Intermedia" | "Baja" | null;
  zona: string | null;
  ciudad: string | null;
  ubicacion_detalle: string | null;
  estado: (typeof ESTADOS)[number];
  creado_en: string;
  atendido_en: string | null;
};

type ItemInventario = {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
};

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

// Cruce simple por palabras en común entre lo que pide el caso y el nombre
// del item en bodega ("agua" en necesidad ↔ "Agua embotellada" en bodega).
// No es IA, es una coincidencia de texto — funciona bien para esto y no
// depende de nada externo.
const PALABRAS_VACIAS = new Set(["de", "la", "el", "los", "las", "y", "para", "con", "en", "un", "una"]);

function palabrasClave(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[.,;:()]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PALABRAS_VACIAS.has(p));
}

function hayCoincidencia(necesidad: string, item: string): boolean {
  const palabrasNecesidad = palabrasClave(necesidad);
  const palabrasItem = palabrasClave(item);
  return palabrasNecesidad.some((pn) => palabrasItem.some((pi) => pi.includes(pn) || pn.includes(pi)));
}

// Verde = solo cuando ya está Cerrado (confirmado). Todo lo demás activo va
// subiendo de temperatura con la edad: naranja (0-2d) → rojo (3-6d) → rojo
// intenso (7d+, hay que revisarlo ya). Gris = cancelado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function colorPorCaso(row: any): string {
  if (row.estado === "Cerrado") return "border-l-4 border-l-success";
  if (row.estado === "Cancelado") return "border-l-4 border-l-border opacity-60";
  const dias = diasDesde(row.creado_en);
  if (dias >= 7) return "border-l-4 border-l-danger-strong";
  if (dias >= 3) return "border-l-4 border-l-danger";
  return "border-l-4 border-l-warning";
}

// Un color pastel/tierra distinto por ciudad, para ubicarse rápido en "Por
// zona". Pereira se queda en la gama de amarillos (con variación por barrio
// para diferenciar zonas dentro de la misma ciudad); el resto de ciudades
// tiene un color fijo y las que no están mapeadas caen en gris.
const AMARILLOS_PEREIRA = [
  "bg-[#FDE68A]/30 border-[#F5C542]/60",
  "bg-[#FCD34D]/25 border-[#EAB308]/50",
  "bg-[#FEF3C7]/40 border-[#D4A72C]/50",
];

const COLOR_POR_CIUDAD: Record<string, string> = {
  manizales: "bg-[#BFDBFE]/30 border-[#60A5FA]/50",
  chinchina: "bg-[#BBF7D0]/30 border-[#4ADE80]/50",
  dosquebradas: "bg-[#FBCEB1]/30 border-[#E0956B]/50",
  villamaria: "bg-[#E9D5FF]/30 border-[#C084FC]/50",
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function hashSimple(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function colorPorZona(ciudad: string | null, zona: string): string {
  const ciudadKey = normalizar(ciudad ?? "");
  if (ciudadKey === "pereira") {
    return AMARILLOS_PEREIRA[hashSimple(zona) % AMARILLOS_PEREIRA.length];
  }
  return COLOR_POR_CIUDAD[ciudadKey] ?? "border-border bg-surface";
}

export default function EmergenciaPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);
  const [ciudadFiltro, setCiudadFiltro] = useState<string>("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [diasMinimo, setDiasMinimo] = useState<number>(0);
  const [busqueda, setBusqueda] = useState<string>("");
  const [itemsEntregados, setItemsEntregados] = useState(0);
  const [itemsTotal, setItemsTotal] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: c }, { data: i }, { data: it }] = await Promise.all([
      supabase
        .from("casos_emergencia")
        .select(
          "id, numero_caso, nombre, necesidad, prioridad, zona, ciudad, ubicacion_detalle, estado, creado_en, atendido_en"
        )
        .is("eliminado_en", null)
        .order("creado_en", { ascending: false }),
      supabase.from("inventario_emergencia").select("id, item, cantidad, unidad").is("eliminado_en", null).order("item"),
      supabase.from("items_caso_emergencia").select("entregado"),
    ]);
    setCasos((c as Caso[]) ?? []);
    setInventario((i as ItemInventario[]) ?? []);
    const itemsList = (it as { entregado: boolean }[]) ?? [];
    setItemsTotal(itemsList.length);
    setItemsEntregados(itemsList.filter((x) => x.entregado).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = casos.length;
  const pendientes = casos.filter((c) => ESTADOS_ACTIVOS.has(c.estado));
  const cerrados = casos.filter((c) => c.estado === "Cerrado");
  const urgentes = casos.filter((c) => c.prioridad === "Urgente" && ESTADOS_ACTIVOS.has(c.estado));
  const pctCerrado = total > 0 ? cerrados.length / total : 0;

  const diasPendientes = pendientes.map((c) => diasDesde(c.creado_en));
  const promedioSinAtender =
    diasPendientes.length > 0 ? diasPendientes.reduce((a, b) => a + b, 0) / diasPendientes.length : 0;
  const masAntiguoSinAtender = diasPendientes.length > 0 ? Math.max(...diasPendientes) : 0;

  const zonaMap = new Map<string, { total: number; pendientes: number; ciudad: string | null; zonaSola: string }>();
  for (const c of casos) {
    const zona = [c.ciudad, c.zona].filter(Boolean).join(" — ") || "Sin zona";
    const acc = zonaMap.get(zona) ?? { total: 0, pendientes: 0, ciudad: c.ciudad, zonaSola: c.zona ?? zona };
    acc.total += 1;
    if (ESTADOS_ACTIVOS.has(c.estado)) acc.pendientes += 1;
    zonaMap.set(zona, acc);
  }
  const porZona = Array.from(zonaMap.entries())
    .map(([zona, v]) => ({ zona, ...v }))
    .sort((a, b) => b.total - a.total);

  const ciudades = useMemo(() => {
    const set = new Set<string>();
    casos.forEach((c) => {
      if (c.ciudad) set.add(c.ciudad);
    });
    return Array.from(set).sort();
  }, [casos]);

  const hayFiltrosActivos =
    Boolean(zonaSeleccionada) ||
    ciudadFiltro !== "todas" ||
    estadoFiltro !== "todos" ||
    soloUrgentes ||
    diasMinimo > 0 ||
    busqueda !== "";

  function limpiarFiltros() {
    setZonaSeleccionada(null);
    setCiudadFiltro("todas");
    setEstadoFiltro("todos");
    setSoloUrgentes(false);
    setDiasMinimo(0);
    setBusqueda("");
  }

  const casosFilter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any) => {
      const q = busqueda.trim().toLowerCase();
      if (q !== "") {
        const coincideNumero = String(row.numero_caso ?? "") === q;
        const coincideNombre = String(row.nombre ?? "").toLowerCase().includes(q);
        const coincideDireccion = String(row.ubicacion_detalle ?? "").toLowerCase().includes(q);
        if (!coincideNumero && !coincideNombre && !coincideDireccion) return false;
      }
      if (zonaSeleccionada) {
        const zona = [row.ciudad, row.zona].filter(Boolean).join(" — ") || "Sin zona";
        if (zona !== zonaSeleccionada) return false;
      }
      if (ciudadFiltro !== "todas" && row.ciudad !== ciudadFiltro) return false;
      if (estadoFiltro !== "todos" && row.estado !== estadoFiltro) return false;
      if (soloUrgentes && row.prioridad !== "Urgente") return false;
      if (diasMinimo > 0 && diasDesde(row.creado_en) < diasMinimo) return false;
      return true;
    },
    [busqueda, zonaSeleccionada, ciudadFiltro, estadoFiltro, soloUrgentes, diasMinimo]
  );

  const sugerencias = useMemo(() => {
    const disponibles = inventario.filter((i) => i.cantidad > 0);
    return pendientes
      .flatMap((caso) =>
        disponibles
          .filter((item) => hayCoincidencia(caso.necesidad, item.item))
          .map((item) => ({ caso, item }))
      )
      .slice(0, 20);
  }, [pendientes, inventario]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Emergencia — Casos del terremoto" subtitle="Seguimiento de personas atendidas y pendientes." />

      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Casos totales" value={String(total)} accentClassName="bg-[#F0EAD6]/60 border-[#C9BFA0]/60" />
            <KpiCard
              label="Activos"
              value={String(pendientes.length)}
              hint="Sin cerrar todavía"
              accentClassName="bg-[#BFDBFE]/30 border-[#60A5FA]/50"
            />
            <KpiCard
              label="Urgentes activos"
              value={String(urgentes.length)}
              hint="Prioridad Urgente"
              accentClassName="bg-[#FED7AA]/35 border-[#F0975A]/50"
            />
            <KpiCard
              label="Cerrados"
              value={`${(pctCerrado * 100).toFixed(0)}%`}
              hint={`${cerrados.length} de ${total}`}
              accentClassName="bg-[#BBF7D0]/30 border-[#4ADE80]/50"
            />
            <KpiCard
              label="Tiempo sin cerrar"
              value={promedioSinAtender < 1 ? "< 1 día" : `${promedioSinAtender.toFixed(1)} días`}
              hint={masAntiguoSinAtender > 0 ? `el más antiguo lleva ${masAntiguoSinAtender}d` : undefined}
              accentClassName="bg-[#FDE68A]/30 border-[#F5C542]/50"
            />
            <KpiCard
              label="Ítems entregados"
              value={itemsTotal > 0 ? `${((itemsEntregados / itemsTotal) * 100).toFixed(0)}%` : "—"}
              hint={itemsTotal > 0 ? `${itemsEntregados} de ${itemsTotal}` : "sin ítems todavía"}
              accentClassName="bg-[#DDD6FE]/35 border-[#A78BFA]/50"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Por zona — toca una para ver solo esos casos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {porZona.map((z) => {
                const activa = zonaSeleccionada === z.zona;
                return (
                  <button
                    key={z.zona}
                    type="button"
                    onClick={() => {
                      setZonaSeleccionada(activa ? null : z.zona);
                      document.getElementById("seccion-casos")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`text-left rounded-lg border p-3 flex items-center justify-between transition-colors hover:brightness-95 ${
                      activa ? "border-accent bg-accent/10" : colorPorZona(z.ciudad, z.zonaSola)
                    }`}
                  >
                    <span className="text-sm">{z.zona}</span>
                    <span className="text-sm text-muted">
                      {z.total} <span className="text-danger">{z.pendientes > 0 ? `· ${z.pendientes} pendientes` : ""}</span>
                    </span>
                  </button>
                );
              })}
              {porZona.length === 0 && <p className="text-sm text-muted">Sin casos todavía.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Qué le podemos dar a quién — según lo que hay en bodega
            </h2>
            <div className="flex flex-col gap-2">
              {sugerencias.map(({ caso, item }, idx) => (
                <div
                  key={`${caso.id}-${item.id}-${idx}`}
                  className="rounded-lg border border-accent/40 bg-accent/5 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{caso.nombre}</span>{" "}
                      <span className="text-muted">necesita: {caso.necesidad}</span>
                    </p>
                    <p className="text-xs text-muted">{caso.zona || "Sin zona"}</p>
                  </div>
                  <span className="text-xs shrink-0 rounded-full bg-accent text-accent-foreground px-2.5 py-1">
                    Tienes {item.cantidad} {item.unidad} de {item.item}
                  </span>
                </div>
              ))}
              {sugerencias.length === 0 && (
                <p className="text-sm text-muted">
                  Sin coincidencias todavía entre lo pendiente y lo que hay en bodega.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Bodega — lo que tenemos para repartir</h2>
            <div className="rounded-lg border border-[#B08968]/40 bg-[#D9C5A0]/20 p-3">
              <DataTable
                table="inventario_emergencia"
                columns={columnasInventario}
                orderBy="item"
                ascending
                onChange={load}
                hasCreatedBy={false}
              />
            </div>
          </div>

          <div id="seccion-casos">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Casos</h2>
              <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-success" /> Cerrado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-warning" /> 0-2 días
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger" /> 3-6 días
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger-strong" /> 7+ días
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por N°, nombre o dirección"
                className="text-sm rounded-md border border-border bg-background px-3 py-1.5 w-56"
              />
              <select value={ciudadFiltro} onChange={(e) => setCiudadFiltro(e.target.value)}>
                <option value="todas">Todas las ciudades</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <select value={diasMinimo} onChange={(e) => setDiasMinimo(Number(e.target.value))}>
                <option value={0}>Cualquier antigüedad</option>
                <option value={2}>+2 días</option>
                <option value={5}>+5 días</option>
                <option value={7}>+7 días</option>
              </select>
              <button
                type="button"
                onClick={() => setSoloUrgentes((v) => !v)}
                className={`text-sm rounded-md px-3 py-1.5 border transition-colors ${
                  soloUrgentes
                    ? "bg-danger text-white border-danger"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Solo urgentes
              </button>
              {zonaSeleccionada && (
                <button
                  type="button"
                  onClick={() => setZonaSeleccionada(null)}
                  className="text-sm rounded-full bg-accent text-accent-foreground px-3 py-1.5"
                >
                  {zonaSeleccionada} ✕
                </button>
              )}
              {hayFiltrosActivos && (
                <button type="button" onClick={limpiarFiltros} className="text-sm text-muted underline">
                  Limpiar filtros
                </button>
              )}
            </div>

            <DataTable
              table="casos_emergencia"
              columns={columns}
              orderBy="numero_caso"
              ascending
              onChange={load}
              externalFilter={casosFilter}
              rowClassName={colorPorCaso}
              hasCreatedBy={false}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Seguimiento por caso — qué ya se entregó y qué falta
            </h2>
            <SeguimientoEntregas casos={pendientes} />
          </div>
        </>
      )}
    </div>
  );
}
