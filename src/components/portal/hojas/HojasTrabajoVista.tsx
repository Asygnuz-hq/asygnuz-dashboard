"use client";

// Módulo "Hojas de Trabajo" tipo Excel (workbook por pestañas).
// Usa tokens semánticos para lucir limpio estilo Airtable/Notion Light en
// el portal cliente (.portal-light) y adaptarse también a /portal-admin.

import { useMemo, useRef, useState, type CSSProperties } from "react";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  Check,
  Eye,
  EyeSlash,
  FileXls,
  MagnifyingGlass,
  Plus,
  Sparkle,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import {
  COLOR_OPCION_HOJA,
  ETIQUETA_TIPO_HOJA,
  PLANTILLAS_HOJA,
  type ColumnaHoja,
  type FilaHoja,
  type HojaTrabajo,
  type TipoHoja,
  type ValorCelda,
} from "@/lib/portal/hojasTipos";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type Props = {
  hojas: HojaTrabajo[];
  editable: boolean;
  colorAcento?: string | null;
  hojaInicialId?: string | null;
  onGuardarHoja?: (
    hojaId: string,
    cambios: { titulo?: string; descripcion?: string; visibleCliente?: boolean; columnas?: ColumnaHoja[]; filas?: FilaHoja[] }
  ) => Promise<void>;
  onCrearHoja?: (nueva: {
    titulo: string;
    tipo: TipoHoja;
    descripcion?: string;
    visibleCliente: boolean;
    columnas: ColumnaHoja[];
    filas: FilaHoja[];
  }) => Promise<HojaTrabajo | null>;
  onBorrarHoja?: (hojaId: string) => Promise<void>;
  onPasarIdeaAParrilla?: (fila: FilaHoja) => Promise<void>;
};

const SIN_BORDE: CSSProperties = { background: "transparent", borderColor: "transparent" };

function tinte(color: string): CSSProperties {
  return {
    borderRadius: 999,
    padding: "2px 10px",
    background: `color-mix(in srgb, ${color} 16%, transparent)`,
    color: `color-mix(in srgb, ${color} 55%, var(--p-ink, var(--foreground)))`,
    border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
  };
}

function nuevoIdFila() {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function slugColumna(label: string, idx: number) {
  const s = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
  return s || `col_${idx + 1}`;
}

export function HojasTrabajoVista({
  hojas,
  editable,
  colorAcento,
  hojaInicialId,
  onGuardarHoja,
  onCrearHoja,
  onBorrarHoja,
  onPasarIdeaAParrilla,
}: Props) {
  const acento = colorAcento || "#C9A45C";
  const acentoInk = `color-mix(in srgb, ${acento} 74%, var(--foreground))`;
  const [activaId, setActivaId] = useState<string>(() => {
    if (hojaInicialId && hojas.some((h) => h.id === hojaInicialId)) return hojaInicialId;
    return hojas[0]?.id ?? "";
  });
  const [busqueda, setBusqueda] = useState("");
  const [filtroBloque, setFiltroBloque] = useState("");
  const [menuNueva, setMenuNueva] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviandoIdeaId, setEnviandoIdeaId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hoja = useMemo(
    () => hojas.find((h) => h.id === activaId) ?? hojas[0] ?? null,
    [hojas, activaId]
  );

  const bloques = useMemo(() => {
    if (!hoja || hoja.tipo !== "tomas") return [];
    return Array.from(new Set(hoja.filas.map((f) => String(f.bloque ?? "")).filter(Boolean)));
  }, [hoja]);

  const filasFiltradas = useMemo(() => {
    if (!hoja) return [];
    const q = busqueda.trim().toLowerCase();
    return hoja.filas.filter((f) => {
      if (filtroBloque && String(f.bloque ?? "") !== filtroBloque) return false;
      if (!q) return true;
      return Object.values(f).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [hoja, busqueda, filtroBloque]);

  const progresoTomas = useMemo(() => {
    if (!hoja || hoja.tipo !== "tomas") return null;
    const esenciales = hoja.filas.filter((f) => String(f.prioridad ?? "").toUpperCase() === "E");
    const esencialesHechas = esenciales.filter((f) => f.hecho === true || f.hecho === "Sí").length;
    const opcionales = hoja.filas.filter((f) => String(f.prioridad ?? "").toUpperCase() !== "E");
    const opcionalesHechas = opcionales.filter((f) => f.hecho === true || f.hecho === "Sí").length;
    return {
      esencialesTotal: esenciales.length,
      esencialesHechas,
      esencialesPct: esenciales.length > 0 ? Math.round((esencialesHechas / esenciales.length) * 100) : 0,
      opcionalesTotal: opcionales.length,
      opcionalesHechas,
    };
  }, [hoja]);

  async function actualizarCelda(filaId: string, colKey: string, valor: ValorCelda) {
    if (!hoja || !onGuardarHoja) return;
    const nuevasFilas = hoja.filas.map((f) => (f.id === filaId ? { ...f, [colKey]: valor } : f));
    await onGuardarHoja(hoja.id, { filas: nuevasFilas });
  }

  async function agregarFila() {
    if (!hoja || !onGuardarHoja) return;
    const nueva: FilaHoja = { id: nuevoIdFila() };
    hoja.columnas.forEach((c) => {
      if (c.key === "num" || c.key === "codigo") {
        nueva[c.key] = String(hoja.filas.length + 1);
      } else if (c.tipo === "check") {
        nueva[c.key] = false;
      } else {
        nueva[c.key] = "";
      }
    });
    await onGuardarHoja(hoja.id, { filas: [...hoja.filas, nueva] });
  }

  async function borrarFila(filaId: string) {
    if (!hoja || !onGuardarHoja) return;
    await onGuardarHoja(hoja.id, { filas: hoja.filas.filter((f) => f.id !== filaId) });
  }

  async function alternarVisibilidad() {
    if (!hoja || !onGuardarHoja) return;
    await onGuardarHoja(hoja.id, { visibleCliente: !hoja.visible_cliente });
  }

  async function crearDesdePlantilla(tipo: TipoHoja) {
    if (!onCrearHoja) return;
    setMenuNueva(false);
    const p = PLANTILLAS_HOJA[tipo];
    const creada = await onCrearHoja({
      titulo: p.titulo,
      tipo,
      descripcion: p.descripcion,
      visibleCliente: tipo !== "tomas",
      columnas: p.columnas,
      filas: [],
    });
    if (creada) setActivaId(creada.id);
  }

  async function importarExcelComoHojas(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onCrearHoja) return;
    setAviso(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let creadas = 0;
      let ultimaId = "";
      for (const nombreHoja of wb.SheetNames) {
        if (/^gu[ií]a$/i.test(nombreHoja.trim())) continue;
        const ws = wb.Sheets[nombreHoja];
        const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
        const idxHeader = matriz.findIndex((row) => {
          const noVacias = row.filter((c) => {
            const s = String(c ?? "").trim();
            return s.length > 0 && s.length < 40;
          });
          return noVacias.length >= 3;
        });
        if (idxHeader < 0) continue;
        const rawHeaders = (matriz[idxHeader] ?? []).map((h) => String(h ?? "").trim());
        const columnas: ColumnaHoja[] = [];
        rawHeaders.forEach((label, idx) => {
          if (!label) return;
          const key = slugColumna(label, idx);
          const esCheck = /hecho|grabado|listo/i.test(label);
          const esPuntaje = /puntaje/i.test(label);
          const esOportunidad = /para\s+\w+|oportunidad/i.test(label);
          columnas.push({
            key,
            label,
            tipo: esCheck ? "check" : esPuntaje ? "puntaje" : esOportunidad ? "oportunidad" : "texto",
          });
        });
        if (columnas.length < 2) continue;

        const filas: FilaHoja[] = [];
        for (let r = idxHeader + 1; r < matriz.length && filas.length < 300; r++) {
          const row = matriz[r] ?? [];
          const valores = columnas.map((_, i) => String(row[i] ?? "").trim());
          if (!valores.some(Boolean)) continue;
          const filaObj: FilaHoja = { id: nuevoIdFila() };
          columnas.forEach((col, i) => {
            const val = valores[i];
            if (col.tipo === "check") filaObj[col.key] = /^s[ií]|true|1|✓$/i.test(val);
            else filaObj[col.key] = val;
          });
          filas.push(filaObj);
        }

        const tipo: TipoHoja = /toma/i.test(nombreHoja)
          ? "tomas"
          : /idea/i.test(nombreHoja)
            ? "ideas"
            : /matriz|angulo/i.test(nombreHoja)
              ? "matriz"
              : /resumen|bench/i.test(nombreHoja)
                ? "benchmarking"
                : "tabla";

        const creada = await onCrearHoja({
          titulo: nombreHoja.slice(0, 100),
          tipo,
          descripcion: `Importada desde ${file.name}`,
          visibleCliente: tipo !== "tomas",
          columnas,
          filas,
        });
        if (creada) {
          creadas++;
          ultimaId = creada.id;
        }
      }
      if (ultimaId) setActivaId(ultimaId);
      setAviso(
        creadas > 0
          ? `Se importaron ${creadas} ${creadas === 1 ? "hoja" : "hojas"} desde ${file.name}.`
          : "No se encontraron tablas importables en el archivo."
      );
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Error leyendo el archivo Excel.");
    } finally {
      e.target.value = "";
    }
  }

  function exportarHojaActual() {
    if (!hoja) return;
    const datos = hoja.filas.map((f) => {
      const obj: Record<string, string | number | boolean> = {};
      hoja.columnas.forEach((c) => {
        const v = f[c.key];
        obj[c.label] = c.tipo === "check" ? (v ? "Sí" : "No") : (v ?? "");
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, hoja.titulo.slice(0, 31));
    XLSX.writeFile(wb, `${hoja.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`);
  }

  async function manejarPasarAParrilla(fila: FilaHoja) {
    if (!onPasarIdeaAParrilla || !hoja) return;
    setEnviandoIdeaId(fila.id);
    setAviso(null);
    try {
      await onPasarIdeaAParrilla(fila);
      if (onGuardarHoja) {
        await actualizarCelda(fila.id, "estado", "En parrilla");
      }
      setAviso(`"${String(fila.idea ?? fila.titulo ?? "Idea")}" enviada a la parrilla de contenido.`);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo pasar la idea a la parrilla.");
    } finally {
      setEnviandoIdeaId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Pestañas estilo workbook */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {hojas.map((h) => {
            const activa = hoja?.id === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setActivaId(h.id);
                  setFiltroBloque("");
                  setBusqueda("");
                }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                style={
                  activa
                    ? {
                        backgroundColor: `color-mix(in srgb, ${acento} 15%, var(--surface))`,
                        color: "var(--foreground)",
                        border: `1px solid color-mix(in srgb, ${acento} 48%, var(--border))`,
                      }
                    : {
                        backgroundColor: "var(--surface)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {editable &&
                  (h.visible_cliente ? (
                    <Eye size={13} style={{ color: acentoInk }} />
                  ) : (
                    <EyeSlash size={13} className="text-muted" />
                  ))}
                <span>{h.titulo}</span>
                <span className="text-[10px] opacity-65 tabular-nums">{h.filas.length}</span>
              </button>
            );
          })}

          {editable && onCrearHoja && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuNueva((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-foreground/40 cursor-pointer"
              >
                <Plus size={13} />
                <span>Nueva hoja</span>
              </button>
              {menuNueva && (
                <div className="portal-card absolute left-0 top-10 z-30 w-56 rounded-xl p-1.5 shadow-xl bg-surface">
                  {(Object.keys(PLANTILLAS_HOJA) as TipoHoja[]).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => crearDesdePlantilla(tipo)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-surface-alt cursor-pointer"
                    >
                      <span className="font-semibold block">{ETIQUETA_TIPO_HOJA[tipo]}</span>
                      <span className="text-[11px] text-muted">{PLANTILLAS_HOJA[tipo].titulo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editable && onCrearHoja && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={importarExcelComoHojas}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt cursor-pointer"
              >
                <UploadSimple size={14} />
                <span>Subir .xlsx</span>
              </button>
            </>
          )}
          {hoja && (
            <button
              type="button"
              onClick={exportarHojaActual}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-alt cursor-pointer"
            >
              <FileXls size={14} style={{ color: acentoInk }} />
              <span>Exportar .xlsx</span>
            </button>
          )}
        </div>
      </div>

      {aviso && (
        <div className="rounded-xl border border-border bg-surface px-4 py-2 text-xs text-foreground">
          {aviso}
        </div>
      )}

      {!hoja ? (
        <div className="portal-card rounded-2xl p-10 text-center">
          <p className="text-sm text-muted">Todavía no hay hojas de trabajo cargadas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Cabecera de la hoja activa */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2
                  className="text-lg font-semibold text-foreground"
                  style={{ fontFamily: FUENTE_DISPLAY }}
                >
                  {hoja.titulo}
                </h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${acento} 15%, var(--surface-alt))`,
                    color: acentoInk,
                  }}
                >
                  {ETIQUETA_TIPO_HOJA[hoja.tipo]}
                </span>
              </div>
              {hoja.descripcion && <p className="text-xs text-muted mt-0.5">{hoja.descripcion}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar filas…"
                  className="rounded-full pl-8 pr-3 py-1.5 text-xs w-48"
                />
              </div>

              {editable && onGuardarHoja && (
                <button
                  type="button"
                  onClick={alternarVisibilidad}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                  style={
                    hoja.visible_cliente
                      ? {
                          borderColor: `color-mix(in srgb, ${acento} 48%, var(--border))`,
                          backgroundColor: `color-mix(in srgb, ${acento} 14%, var(--surface))`,
                          color: acentoInk,
                        }
                      : {
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--muted)",
                        }
                  }
                >
                  {hoja.visible_cliente ? <Eye size={14} /> : <EyeSlash size={14} />}
                  <span>{hoja.visible_cliente ? "Visible para el cliente" : "Solo interno ASYGNUZ"}</span>
                </button>
              )}

              {editable && onBorrarHoja && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar la hoja "${hoja.titulo}"?`)) return;
                    await onBorrarHoja(hoja.id);
                  }}
                  className="rounded-full border border-border bg-surface p-1.5 text-muted hover:text-danger cursor-pointer"
                  title="Eliminar hoja"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Barra de progreso en vivo para Lista de Tomas */}
          {progresoTomas && (
            <div className="portal-card rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <span className="text-foreground">
                    <strong>Esenciales:</strong>{" "}
                    <span className="font-semibold" style={{ color: acentoInk }}>
                      {progresoTomas.esencialesHechas} / {progresoTomas.esencialesTotal}
                    </span>{" "}
                    ({progresoTomas.esencialesPct}%)
                  </span>
                  <span className="text-muted">
                    Opcionales: {progresoTomas.opcionalesHechas} / {progresoTomas.opcionalesTotal}
                  </span>
                </div>
                {bloques.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFiltroBloque("")}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer ${
                        filtroBloque === "" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                      }`}
                    >
                      Todos
                    </button>
                    {bloques.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFiltroBloque(b)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer ${
                          filtroBloque === b ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {b.split("(")[0].trim()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progresoTomas.esencialesPct}%`, backgroundColor: acento }}
                />
              </div>
            </div>
          )}

          {/* Tabla tipo Excel en Double-Bezel Liquid Glass */}
          <div className="portal-bezel">
            <div className="portal-bezel-core overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr
                  className="text-left text-[11px] uppercase tracking-wider border-b"
                  style={{
                    backgroundColor: "var(--p-table-head, var(--surface-alt))",
                    borderColor: "var(--p-border, var(--border))",
                    color: "var(--p-muted, var(--muted))",
                  }}
                >
                  {hoja.columnas.map((col) => (
                    <th
                      key={col.key}
                      className="px-3.5 py-3 font-semibold whitespace-nowrap"
                      style={col.ancho ? { width: col.ancho } : undefined}
                    >
                      {col.label}
                    </th>
                  ))}
                  {editable && (hoja.tipo === "ideas" || onGuardarHoja) && (
                    <th className="px-3.5 py-3 text-right font-semibold whitespace-nowrap">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hoja.columnas.length + (editable ? 1 : 0)}
                      className="px-4 py-8 text-center text-xs text-muted"
                    >
                      Sin filas que coincidan.
                    </td>
                  </tr>
                ) : (
                  filasFiltradas.map((fila) => (
                    <tr
                      key={fila.id}
                      className="border-b border-border/60 hover:bg-surface-alt/55 align-middle transition-colors"
                    >
                      {hoja.columnas.map((col) => (
                        <td key={col.key} className="px-3.5 py-2.5">
                          <CeldaHoja
                            col={col}
                            valor={fila[col.key]}
                            editable={editable}
                            acento={acento}
                            acentoInk={acentoInk}
                            onGuardar={(v) => actualizarCelda(fila.id, col.key, v)}
                          />
                        </td>
                      ))}
                      {editable && (
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {hoja.tipo === "ideas" && onPasarIdeaAParrilla && (
                              <button
                                type="button"
                                disabled={enviandoIdeaId === fila.id}
                                onClick={() => manejarPasarAParrilla(fila)}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${acento} 16%, var(--surface-alt))`,
                                  color: acentoInk,
                                }}
                                title="Convertir esta idea en pieza dentro de la Parrilla"
                              >
                                <span>{enviandoIdeaId === fila.id ? "Enviando..." : "A parrilla"}</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => borrarFila(fila.id)}
                              className="text-muted hover:text-danger p-1 cursor-pointer"
                              title="Eliminar fila"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {editable && onGuardarHoja && (
              <button
                type="button"
                onClick={agregarFila}
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-alt border-t border-border cursor-pointer"
              >
                <Plus size={14} />
                <span>Agregar fila</span>
              </button>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CeldaHoja({
  col,
  valor,
  editable,
  acento,
  acentoInk,
  onGuardar,
}: {
  col: ColumnaHoja;
  valor: ValorCelda;
  editable: boolean;
  acento: string;
  acentoInk: string;
  onGuardar: (v: ValorCelda) => void;
}) {
  if (col.tipo === "check") {
    const marcado = valor === true || valor === "Sí" || valor === "Si";
    if (!editable) {
      return marcado ? (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-md"
          style={{
            backgroundColor: "color-mix(in srgb, var(--success) 16%, transparent)",
            color: "var(--success)",
          }}
        >
          <Check size={12} weight="bold" />
        </span>
      ) : (
        <span className="inline-block h-5 w-5 rounded-md border border-border" />
      );
    }
    return (
      <button
        type="button"
        onClick={() => onGuardar(!marcado)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors cursor-pointer"
        style={
          marcado
            ? { backgroundColor: acento, borderColor: acento, color: "#09090B" }
            : { borderColor: "var(--border)", backgroundColor: "transparent" }
        }
        aria-label={marcado ? "Marcar como pendiente" : "Marcar como hecho"}
      >
        {marcado && <Check size={12} weight="bold" />}
      </button>
    );
  }

  if (col.tipo === "oportunidad") {
    const txt = String(valor ?? "").trim();
    if (!txt) return <span className="text-xs text-muted/50">—</span>;
    const esOportunidad = /oportunidad/i.test(txt);
    if (esOportunidad) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
          style={{
            backgroundColor: `color-mix(in srgb, ${acento} 18%, var(--surface))`,
            color: acentoInk,
            border: `1px solid color-mix(in srgb, ${acento} 44%, var(--border))`,
          }}
        >
          <Sparkle size={11} weight="fill" />
          {txt}
        </span>
      );
    }
    return <span className="text-xs text-muted">{txt}</span>;
  }

  if (col.tipo === "puntaje") {
    const num = Number(valor);
    if (!Number.isFinite(num) || num <= 0) {
      return editable ? (
        <input
          defaultValue={String(valor ?? "")}
          onBlur={(e) => e.target.value !== String(valor ?? "") && onGuardar(e.target.value)}
          className="w-16 text-xs"
          style={SIN_BORDE}
        />
      ) : (
        <span className="text-xs text-muted">—</span>
      );
    }
    const pct = Math.min(100, Math.round((num / 5) * 100));
    return (
      <div className="flex items-center gap-2 min-w-[88px]">
        <span className="text-xs font-semibold text-foreground tabular-nums">{num.toFixed(1)}</span>
        <div className="h-1.5 flex-1 rounded-full bg-surface-alt overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: acento }} />
        </div>
      </div>
    );
  }

  if (col.tipo === "select") {
    const str = String(valor ?? "");
    const color = COLOR_OPCION_HOJA[str] ?? "#64748b";
    if (!editable) {
      return str ? (
        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap" style={tinte(color)}>
          {str}
        </span>
      ) : (
        <span className="text-xs text-muted/50">—</span>
      );
    }
    const opciones = col.opciones ? [...col.opciones] : [];
    if (str && !opciones.includes(str)) opciones.push(str);
    return (
      <select
        value={str}
        onChange={(e) => onGuardar(e.target.value)}
        className="rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer appearance-none"
        style={str ? tinte(color) : { ...SIN_BORDE, color: "var(--muted)" }}
      >
        <option value="">—</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (col.tipo === "numero") {
    const str = String(valor ?? "").trim();
    if (!editable) {
      if (!str) return <span className="text-xs text-muted/50">—</span>;
      const n = Number(str);
      return (
        <span className="text-xs tabular-nums font-medium text-foreground">
          {Number.isFinite(n) ? n.toLocaleString("es-CO") : str}
        </span>
      );
    }
    return (
      <input
        defaultValue={str}
        onBlur={(e) => e.target.value.trim() !== str && onGuardar(e.target.value.trim())}
        className="w-24 text-xs tabular-nums"
        style={SIN_BORDE}
      />
    );
  }

  const str = String(valor ?? "");
  if (!editable) {
    if (!str) return <span className="text-xs text-muted/50">—</span>;
    if (str === "Sí") {
      return (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full"
          style={{
            backgroundColor: "color-mix(in srgb, var(--success) 16%, transparent)",
            color: "var(--success)",
          }}
        >
          <Check size={11} weight="bold" />
        </span>
      );
    }
    return <span className="text-xs leading-relaxed text-foreground">{str}</span>;
  }

  return (
    <input
      defaultValue={str}
      onBlur={(e) => e.target.value !== str && onGuardar(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full min-w-[90px] text-xs"
      style={SIN_BORDE}
    />
  );
}
