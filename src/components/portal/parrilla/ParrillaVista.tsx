"use client";

// Parrilla de contenido v2 tipo Excel + Calendario + Aprobación 1 clic + Importar/Exportar .xlsx.
// Usa tokens semánticos (bg-surface, bg-surface-alt, border-border, text-foreground, text-muted)
// para lucir impecable tanto en el portal cliente claro (.portal-light) como en portal-admin.

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  CalendarBlank,
  CheckCircle,
  Copy,
  DownloadSimple,
  Eye,
  EyeSlash,
  FileXls,
  PencilSimple,
  Plus,
  Table,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import {
  APROBACION_COLOR,
  APROBACION_LABEL,
  ESTADO_COLOR,
  ESTADO_LABEL,
} from "@/components/portal/TarjetaSeccion";
import {
  CANALES,
  FORMATOS,
  PILARES,
  USOS,
  colorDe,
  diaCorto,
  fechaCorta,
  fechaLocal,
  horaCorta,
  iso,
  lunesDe,
  ordenar,
  type Contenido,
} from "./tipos";

export type FilaImportable = {
  titulo: string;
  tipo?: string;
  plataforma?: string;
  fechaPublicacion?: string;
  estado?: (typeof ESTADOS_CONTENIDO)[number];
  pilar?: string;
  copy?: string;
  notas?: string;
  campana?: string;
  uso?: string;
  procedimiento?: string;
  duracion?: string;
  gancho?: string;
  cuerpo?: string;
  cta?: string;
  visibleCliente?: boolean;
  guionVisibleCliente?: boolean;
};

type Props = {
  contenido: Contenido[];
  editable: boolean;
  colorAcento?: string | null;
  onActualizar?: (id: string, campo: keyof Contenido, valor: string | boolean) => Promise<void>;
  onAgregar?: (fecha: string, campana?: string) => Promise<void>;
  onBorrar?: (id: string) => Promise<void>;
  onImportar?: (filas: FilaImportable[], campana?: string) => Promise<void>;
  onAprobar?: (id: string, estado: "aprobado" | "cambios" | "pendiente", comentario: string) => Promise<void>;
};

const SIN_BORDE: CSSProperties = { background: "transparent", borderColor: "transparent" };
const PILDORA: CSSProperties = { borderRadius: 999, padding: "2px 10px" };

function tinte(color: string): CSSProperties {
  return {
    ...PILDORA,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    color: `color-mix(in srgb, ${color} 82%, var(--foreground))`,
    borderColor: "transparent",
  };
}

function normalizarClave(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapearEstado(raw: string): (typeof ESTADOS_CONTENIDO)[number] {
  const v = normalizarClave(raw);
  if (v.includes("public")) return "publicado";
  if (v.includes("progr")) return "programado";
  if (v.includes("revis") || v.includes("aprob")) return "revision";
  if (v.includes("edic")) return "edicion";
  if (v.includes("grab")) return "grabacion";
  return "idea";
}

function parsearExcelParrilla(buffer: ArrayBuffer, nombreArchivo: string): FilaImportable[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const hojaPref =
    wb.SheetNames.find((n) => /guion|parrilla|black week|contenido/i.test(n)) ?? wb.SheetNames[0];
  const ws = wb.Sheets[hojaPref];
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let idxHeader = matriz.findIndex((row) =>
    row.some((cell) => {
      const k = normalizarClave(String(cell ?? ""));
      return k === "pieza" || k === "tema" || k === "reel" || k === "titulo" || k === "gancho";
    })
  );
  if (idxHeader < 0) idxHeader = 0;

  const headers = (matriz[idxHeader] ?? []).map((h) => normalizarClave(String(h ?? "")));
  const campanaDef = nombreArchivo.replace(/\.xlsx?$/i, "").replace(/_/g, " ").trim().slice(0, 80);

  const resultados: FilaImportable[] = [];
  for (let r = idxHeader + 1; r < matriz.length; r++) {
    const fila = matriz[r] ?? [];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = String(fila[i] ?? "").trim();
    });

    const titulo = obj["pieza"] || obj["tema"] || obj["reel"] || obj["titulo"] || obj["idea"] || "";
    if (!titulo || titulo.length > 160) continue;

    const usoRaw = obj["uso"] || obj["tipo"] || "";
    const uso = /pauta|anuncio/i.test(usoRaw)
      ? "Pauta"
      : /historia/i.test(usoRaw)
        ? "Historias"
        : /vivo|live/i.test(usoRaw)
          ? "En vivo"
          : /organico|redes/i.test(usoRaw)
            ? "Orgánico"
            : usoRaw || undefined;

    const formato =
      obj["formato"] || (/anuncio/i.test(usoRaw) ? "Anuncio" : /historia/i.test(usoRaw) ? "Historia" : "Reels");

    resultados.push({
      titulo,
      tipo: formato.slice(0, 60),
      plataforma: uso === "Pauta" ? "Meta Ads" : "Instagram",
      estado: mapearEstado(obj["estado"] || "idea"),
      campana: obj["campana"] || campanaDef || undefined,
      uso,
      procedimiento: (obj["procedimiento"] || "").slice(0, 80) || undefined,
      duracion: (obj["duracion"] || "").slice(0, 40) || undefined,
      pilar: (obj["pilar"] || "").slice(0, 60) || undefined,
      gancho: (obj["gancho"] || "").slice(0, 2000) || undefined,
      cuerpo: (obj["cuerpo"] || obj["que hacemos"] || "").slice(0, 4000) || undefined,
      cta: (obj["cierre cta"] || obj["cta"] || "").slice(0, 1000) || undefined,
      copy: (obj["copy"] || obj["que hacemos"] || "").slice(0, 4000) || undefined,
      notas:
        [
          obj["dia pub"] && `Publicación: ${obj["dia pub"]}`,
          obj["tomas clave"] && `Tomas: ${obj["tomas clave"]}`,
          obj["sale"] && `Sale: ${obj["sale"]}`,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      visibleCliente: true,
      guionVisibleCliente: false,
    });
  }
  return resultados;
}

export default function ParrillaVista({
  contenido,
  editable,
  colorAcento,
  onActualizar,
  onAgregar,
  onBorrar,
  onImportar,
  onAprobar,
}: Props) {
  const acento = colorAcento || "#C9A45C";
  const acentoInk = `color-mix(in srgb, ${acento} 74%, var(--foreground))`;
  const [vista, setVista] = useState<"tabla" | "calendario">("tabla");
  const [filtroCampana, setFiltroCampana] = useState<string>("");
  const [filtroUso, setFiltroUso] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<string>("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [avisoImport, setAvisoImport] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const campanas = useMemo(
    () => Array.from(new Set(contenido.map((c) => c.campana).filter(Boolean))) as string[],
    [contenido]
  );

  const canales = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(CANALES), ...contenido.map((c) => c.plataforma).filter(Boolean)])
      ) as string[],
    [contenido]
  );

  const usos = useMemo(
    () =>
      Array.from(new Set([...Object.keys(USOS), ...contenido.map((c) => c.uso).filter(Boolean)])) as string[],
    [contenido]
  );

  const filtrado = useMemo(
    () =>
      contenido
        .filter((c) => !filtroCampana || c.campana === filtroCampana)
        .filter((c) => !filtroUso || c.uso === filtroUso)
        .filter((c) => !filtroEstado || c.estado === filtroEstado)
        .filter((c) => !filtroCanal || c.plataforma === filtroCanal)
        .sort(ordenar),
    [contenido, filtroCampana, filtroUso, filtroEstado, filtroCanal]
  );

  const seleccionado = contenido.find((c) => c.id === abierto) ?? null;
  const guardar = editable && onActualizar ? onActualizar : undefined;

  async function manejarArchivoExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImportar) return;
    setImportando(true);
    setAvisoImport(null);
    try {
      const buf = await file.arrayBuffer();
      const filas = parsearExcelParrilla(buf, file.name);
      if (filas.length === 0) {
        setAvisoImport("No se detectaron filas válidas (busca columnas Pieza/Tema/Reel).");
      } else {
        await onImportar(filas, filtroCampana || undefined);
        setAvisoImport(`Se importaron ${filas.length} piezas desde ${file.name}.`);
      }
    } catch (err) {
      setAvisoImport(err instanceof Error ? err.message : "No se pudo leer el archivo Excel.");
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  }

  function exportarExcel() {
    const filas = filtrado.map((c) => ({
      Campaña: c.campana ?? "",
      Uso: c.uso ?? "",
      Canal: c.plataforma ?? "",
      Fecha: c.fecha_publicacion ?? "",
      Hora: c.hora ?? "",
      Estado: ESTADO_LABEL[c.estado] ?? c.estado,
      Aprobación: APROBACION_LABEL[c.aprobacion_cliente ?? "pendiente"] ?? "",
      Pilar: c.pilar ?? "",
      Procedimiento: c.procedimiento ?? "",
      Formato: c.tipo ?? "",
      Duración: c.duracion ?? "",
      Pieza: c.titulo,
      Copy: c.copy ?? "",
      ...(editable || c.guion_visible_cliente
        ? {
            Gancho: c.gancho ?? "",
            Cuerpo: c.cuerpo ?? "",
            CTA: c.cta ?? "",
          }
        : {}),
      Drive: c.link_drive ?? "",
      Publicación: c.link ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parrilla");
    XLSX.writeFile(
      wb,
      `parrilla-${filtroCampana ? filtroCampana.toLowerCase().replace(/\s+/g, "-") : "completa"}.xlsx`
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pestañas de Campaña / Jornada */}
      {campanas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setFiltroCampana("")}
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            style={
              filtroCampana === ""
                ? {
                    backgroundColor: `color-mix(in srgb, ${acento} 15%, var(--surface))`,
                    color: "var(--foreground)",
                    border: `1px solid color-mix(in srgb, ${acento} 48%, var(--border))`,
                  }
                : { color: "var(--muted)", border: "1px solid transparent" }
            }
          >
            Todas ({contenido.length})
          </button>
          {campanas.map((camp) => {
            const activa = filtroCampana === camp;
            const n = contenido.filter((c) => c.campana === camp).length;
            return (
              <button
                key={camp}
                type="button"
                onClick={() => setFiltroCampana(camp)}
                className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                style={
                  activa
                    ? {
                        backgroundColor: `color-mix(in srgb, ${acento} 15%, var(--surface))`,
                        color: "var(--foreground)",
                        border: `1px solid color-mix(in srgb, ${acento} 48%, var(--border))`,
                      }
                    : { color: "var(--muted)", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }
                }
              >
                {camp} · {n}
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="portal-card rounded-full p-1 flex gap-1">
            {(["tabla", "calendario"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold cursor-pointer ${
                  vista === v ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                }`}
              >
                {v === "tabla" ? <Table size={13} /> : <CalendarBlank size={13} />}
                <span>{v === "tabla" ? "Tabla" : "Calendario"}</span>
              </button>
            ))}
          </div>

          <select
            value={filtroUso}
            onChange={(e) => setFiltroUso(e.target.value)}
            className="text-xs rounded-full px-3 py-1.5"
          >
            <option value="">Todos los usos</option>
            {usos.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={filtroCanal}
            onChange={(e) => setFiltroCanal(e.target.value)}
            className="text-xs rounded-full px-3 py-1.5"
          >
            <option value="">Todos los canales</option>
            {canales.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            <BotonFiltro activo={filtroEstado === null} onClick={() => setFiltroEstado(null)}>
              Todas · {filtrado.length}
            </BotonFiltro>
            {ESTADOS_CONTENIDO.map((e) => {
              const n = contenido.filter((c) => (!filtroCampana || c.campana === filtroCampana) && c.estado === e).length;
              if (!n && filtroEstado !== e) return null;
              return (
                <BotonFiltro key={e} activo={filtroEstado === e} onClick={() => setFiltroEstado(e)}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ESTADO_COLOR[e] }} aria-hidden />
                  {ESTADO_LABEL[e]} · {n}
                </BotonFiltro>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editable && onImportar && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={manejarArchivoExcel}
              />
              <button
                type="button"
                disabled={importando}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt cursor-pointer disabled:opacity-50"
              >
                <UploadSimple size={14} />
                <span>{importando ? "Importando..." : "Importar Excel"}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={exportarExcel}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-alt cursor-pointer"
          >
            <FileXls size={14} style={{ color: acentoInk }} />
            <span>Exportar .xlsx</span>
          </button>
        </div>
      </div>

      {avisoImport && (
        <div className="rounded-xl border border-border bg-surface px-4 py-2 text-xs text-foreground">
          {avisoImport}
        </div>
      )}

      {vista === "tabla" ? (
        <Tabla
          filas={filtrado}
          editable={editable}
          guardar={guardar}
          abrir={setAbierto}
          onAgregar={editable && onAgregar ? () => onAgregar(iso(new Date()), filtroCampana || undefined) : undefined}
        />
      ) : (
        <Calendario filas={filtrado} abrir={setAbierto} />
      )}

      {seleccionado && (
        <Detalle
          c={seleccionado}
          editable={editable}
          acento={acento}
          guardar={guardar}
          onBorrar={editable ? onBorrar : undefined}
          onAprobar={!editable ? onAprobar : undefined}
          cerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

function BotonFiltro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
        activo
          ? "border-foreground/30 bg-surface-alt text-foreground"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- tabla

function Tabla({
  filas,
  editable,
  guardar,
  abrir,
  onAgregar,
}: {
  filas: Contenido[];
  editable: boolean;
  guardar?: Props["onActualizar"];
  abrir: (id: string) => void;
  onAgregar?: () => Promise<void>;
}) {
  const columnas = editable
    ? ["Uso", "Canal", "Fecha", "Estado", "Aprobación", "Pilar", "Procedimiento", "Formato", "Pieza", "Detalle / Guion", "Drive", "Post"]
    : ["Uso", "Canal", "Fecha", "Estado", "Aprobación", "Procedimiento", "Formato", "Pieza", "Resumen", "Drive", "Post"];

  const semanas = useMemo(() => {
    const grupos: { clave: string; filas: Contenido[] }[] = [];
    for (const f of filas) {
      const clave = f.fecha_publicacion ? lunesDe(f.fecha_publicacion) : "sin-fecha";
      const g = grupos.find((x) => x.clave === clave);
      if (g) g.filas.push(f);
      else grupos.push({ clave, filas: [f] });
    }
    return grupos;
  }, [filas]);

  return (
    <div className="portal-card rounded-2xl overflow-x-auto">
      <table className="w-full text-sm min-w-[1220px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-border bg-surface-alt/75">
            {columnas.map((c) => (
              <th key={c} className="px-3.5 py-3 font-semibold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-3 py-8 text-center text-muted">
                No hay publicaciones con estos filtros.
              </td>
            </tr>
          )}
          {semanas.map((s) => (
            <SemanaFilas
              key={s.clave}
              clave={s.clave}
              filas={s.filas}
              colCount={columnas.length}
              editable={editable}
              guardar={guardar}
              abrir={abrir}
            />
          ))}
        </tbody>
      </table>
      {onAgregar && (
        <button
          type="button"
          onClick={onAgregar}
          className="flex w-full items-center gap-2 px-4 py-3 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-alt border-t border-border cursor-pointer"
        >
          <Plus size={14} />
          <span>Nueva pieza en parrilla</span>
        </button>
      )}
    </div>
  );
}

function SemanaFilas({
  clave,
  filas,
  colCount,
  editable,
  guardar,
  abrir,
}: {
  clave: string;
  filas: Contenido[];
  colCount: number;
  editable: boolean;
  guardar?: Props["onActualizar"];
  abrir: (id: string) => void;
}) {
  let titulo = "Sin fecha asignada";
  if (clave !== "sin-fecha") {
    const fin = fechaLocal(clave);
    fin.setDate(fin.getDate() + 6);
    titulo = `Semana del ${fechaCorta(clave)} al ${fechaCorta(iso(fin))}`;
  }
  return (
    <>
      <tr className="bg-surface-alt/45 border-b border-border/60">
        <td colSpan={colCount} className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {titulo} · {filas.length} {filas.length === 1 ? "pieza" : "piezas"}
        </td>
      </tr>
      {filas.map((c) => (
        <Fila key={c.id} c={c} editable={editable} guardar={guardar} abrir={abrir} />
      ))}
    </>
  );
}

function Fila({
  c,
  editable,
  guardar,
  abrir,
}: {
  c: Contenido;
  editable: boolean;
  guardar?: Props["onActualizar"];
  abrir: (id: string) => void;
}) {
  const g = (campo: keyof Contenido) => (valor: string | boolean) => guardar?.(c.id, campo, valor);
  const estadoAprob = c.aprobacion_cliente ?? "pendiente";
  const ocultaCliente = c.visible_cliente === false;

  return (
    <tr
      className={`border-b border-border/60 hover:bg-surface-alt/55 align-middle transition-colors ${
        ocultaCliente ? "opacity-60" : ""
      }`}
    >
      <td className="px-3.5 py-2.5">
        <ChipSelect valor={c.uso ?? null} catalogo={USOS} guardar={guardar && g("uso")} vacio="Uso" />
      </td>
      <td className="px-3.5 py-2.5">
        <ChipSelect valor={c.plataforma} catalogo={CANALES} guardar={guardar && g("plataforma")} vacio="Canal" />
      </td>
      <td className="px-3.5 py-2.5 whitespace-nowrap">
        {guardar ? (
          <input
            type="date"
            defaultValue={c.fecha_publicacion ?? ""}
            onChange={(e) => g("fecha_publicacion")(e.target.value)}
            className="text-xs"
            style={SIN_BORDE}
          />
        ) : c.fecha_publicacion ? (
          <span className="text-xs font-medium text-foreground">
            <span className="text-muted font-normal mr-1">{diaCorto(c.fecha_publicacion)}</span>
            {fechaCorta(c.fecha_publicacion)}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-3.5 py-2.5">
        <ChipEstado valor={c.estado} guardar={guardar && g("estado")} />
      </td>
      <td className="px-3.5 py-2.5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => abrir(c.id)}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer"
          style={tinte(APROBACION_COLOR[estadoAprob] ?? "#64748b")}
          title={c.comentario_cliente || "Ver detalle / aprobación"}
        >
          {APROBACION_LABEL[estadoAprob] ?? estadoAprob}
        </button>
      </td>
      {editable && (
        <td className="px-3.5 py-2.5">
          <ChipSelect valor={c.pilar} catalogo={PILARES} guardar={guardar && g("pilar")} vacio="Pilar" />
        </td>
      )}
      <td className="px-3.5 py-2.5 min-w-[130px]">
        {guardar ? (
          <TextoCelda valor={c.procedimiento ?? ""} placeholder="Procedimiento" guardar={g("procedimiento")} />
        ) : (
          <span className="text-xs text-muted">{c.procedimiento || "—"}</span>
        )}
      </td>
      <td className="px-3.5 py-2.5">
        <ChipSelect valor={c.tipo} catalogo={FORMATOS} guardar={guardar && g("tipo")} vacio="Formato" />
      </td>
      <td className="px-3.5 py-2.5 min-w-[210px]">
        <div className="flex items-center gap-1.5">
          {editable && ocultaCliente && (
            <span title="Oculta para el cliente (solo ASYGNUZ)" className="text-muted shrink-0">
              <EyeSlash size={13} />
            </span>
          )}
          {guardar ? (
            <TextoCelda valor={c.titulo} guardar={g("titulo")} className="font-medium text-foreground" />
          ) : (
            <button
              type="button"
              onClick={() => abrir(c.id)}
              className="font-semibold text-foreground text-left hover:underline cursor-pointer"
            >
              {c.titulo}
            </button>
          )}
        </div>
      </td>
      <td className="px-3.5 py-2.5 max-w-[240px]">
        <button
          type="button"
          onClick={() => abrir(c.id)}
          className="text-left text-xs text-muted hover:text-foreground line-clamp-2 cursor-pointer"
        >
          {c.copy || (editable && c.gancho ? `Guion: ${c.gancho}` : null) || (guardar ? "+ Abrir detalle / guion" : "Ver detalle")}
        </button>
      </td>
      <td className="px-3.5 py-2.5 whitespace-nowrap">
        <Enlace url={c.link_drive} texto="Drive" guardar={guardar && g("link_drive")} />
      </td>
      <td className="px-3.5 py-2.5 whitespace-nowrap">
        <Enlace url={c.link} texto="Post" guardar={guardar && g("link")} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- celdas

function ChipSelect({
  valor,
  catalogo,
  guardar,
  vacio,
}: {
  valor: string | null;
  catalogo: Record<string, string>;
  guardar?: (v: string) => void;
  vacio: string;
}) {
  const color = colorDe(catalogo, valor);
  const clase = "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (!guardar) {
    return valor ? (
      <span className={clase} style={tinte(color)}>
        {valor}
      </span>
    ) : (
      <span className="text-muted text-xs">—</span>
    );
  }
  const opciones = Object.keys(catalogo);
  if (valor && !opciones.includes(valor)) opciones.push(valor);
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => guardar(e.target.value)}
      className={`${clase} cursor-pointer appearance-none`}
      style={valor ? tinte(color) : { ...SIN_BORDE, ...PILDORA, color: "var(--muted)" }}
    >
      <option value="">{vacio}…</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ChipEstado({ valor, guardar }: { valor: string; guardar?: (v: string) => void }) {
  const color = ESTADO_COLOR[valor] ?? "#64748b";
  const clase = "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (!guardar) {
    return (
      <span className={clase} style={tinte(color)}>
        {ESTADO_LABEL[valor] ?? valor}
      </span>
    );
  }
  return (
    <select
      value={valor}
      onChange={(e) => guardar(e.target.value)}
      className={`${clase} cursor-pointer appearance-none`}
      style={tinte(color)}
    >
      {ESTADOS_CONTENIDO.map((e) => (
        <option key={e} value={e}>
          {ESTADO_LABEL[e]}
        </option>
      ))}
    </select>
  );
}

function TextoCelda({
  valor,
  placeholder,
  guardar,
  className,
}: {
  valor: string;
  placeholder?: string;
  guardar: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      defaultValue={valor}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== valor) guardar(v);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`w-full text-xs ${className ?? ""}`}
      style={SIN_BORDE}
    />
  );
}

function Enlace({ url, texto, guardar }: { url: string | null; texto: string; guardar?: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  if (editando && guardar) {
    return (
      <input
        autoFocus
        type="url"
        placeholder="https://…"
        defaultValue={url ?? ""}
        onBlur={(e) => {
          setEditando(false);
          if (e.target.value.trim() !== (url ?? "")) guardar(e.target.value.trim());
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="text-xs w-40"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {!url && guardar ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-xs text-muted hover:text-foreground cursor-pointer"
        >
          + {texto}
        </button>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-border bg-surface hover:bg-surface-alt text-foreground"
        >
          {texto} ↗
        </a>
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
      {guardar && url && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-xs text-muted hover:text-foreground cursor-pointer"
          title="Editar enlace"
        >
          <PencilSimple size={12} />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- calendario

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Calendario({ filas, abrir }: { filas: Contenido[]; abrir: (id: string) => void }) {
  const primera = filas.find((f) => f.fecha_publicacion && f.fecha_publicacion >= iso(new Date()))?.fecha_publicacion;
  const [mes, setMes] = useState(() => {
    const base = primera ? fechaLocal(primera) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const celdas = useMemo(() => {
    const inicio = new Date(mes);
    inicio.setDate(1 - ((mes.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mes]);

  const porDia = useMemo(() => {
    const m: Record<string, Contenido[]> = {};
    for (const f of filas) if (f.fecha_publicacion) (m[f.fecha_publicacion] ??= []).push(f);
    return m;
  }, [filas]);

  const hoy = iso(new Date());
  const t = mes.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const titulo = t.charAt(0).toUpperCase() + t.slice(1);

  return (
    <div className="portal-card rounded-2xl p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          className="text-muted hover:text-foreground px-2 cursor-pointer"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-foreground">{titulo}</span>
        <button
          type="button"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          className="text-muted hover:text-foreground px-2 cursor-pointer"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {DIAS.map((d) => (
          <div key={d} className="bg-surface-alt px-2 py-2 text-[11px] uppercase tracking-wider text-muted font-semibold">
            {d}
          </div>
        ))}
        {celdas.map((d) => {
          const clave = iso(d);
          const delMes = d.getMonth() === mes.getMonth();
          return (
            <div key={clave} className={`bg-surface min-h-[108px] p-1.5 flex flex-col gap-1 ${delMes ? "" : "opacity-45"}`}>
              <span
                className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                  clave === hoy ? "bg-foreground text-background font-semibold" : "text-muted"
                }`}
              >
                {d.getDate()}
              </span>
              {(porDia[clave] ?? []).map((c) => {
                const color = colorDe(USOS, c.uso) || colorDe(FORMATOS, c.tipo);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => abrir(c.id)}
                    className="text-left rounded-lg px-2 py-1 text-[11px] leading-tight hover:opacity-90 cursor-pointer"
                    style={{ background: `color-mix(in srgb, ${color} 14%, var(--surface-alt))` }}
                  >
                    <span
                      className="flex items-center gap-1 font-semibold"
                      style={{ color: `color-mix(in srgb, ${color} 80%, var(--foreground))` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: colorDe(CANALES, c.plataforma) }} />
                      {c.uso || c.tipo || "Pieza"}
                      {c.hora && <span className="text-muted font-normal">· {horaCorta(c.hora)}</span>}
                    </span>
                    <span className="block truncate text-foreground font-medium">{c.titulo}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- detalle

function Detalle({
  c,
  editable,
  acento,
  guardar,
  onBorrar,
  onAprobar,
  cerrar,
}: {
  c: Contenido;
  editable: boolean;
  acento: string;
  guardar?: Props["onActualizar"];
  onBorrar?: (id: string) => Promise<void>;
  onAprobar?: Props["onAprobar"];
  cerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [comentario, setComentario] = useState(c.comentario_cliente ?? "");
  const [enviandoAprob, setEnviandoAprob] = useState(false);

  const acentoInk = `color-mix(in srgb, ${acento} 74%, var(--foreground))`;
  const mostrarGuion = editable || c.guion_visible_cliente === true;
  const estadoAprob = c.aprobacion_cliente ?? "pendiente";

  async function enviarAprobacion(nuevoEstado: "aprobado" | "cambios") {
    if (!onAprobar) return;
    setEnviandoAprob(true);
    try {
      await onAprobar(c.id, nuevoEstado, comentario);
    } finally {
      setEnviandoAprob(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4"
      onClick={cerrar}
    >
      <div
        className="portal-card rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 flex flex-col gap-5 bg-surface text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">
              {[
                c.campana,
                c.uso,
                c.plataforma,
                c.tipo,
                c.duracion,
                c.fecha_publicacion && `${diaCorto(c.fecha_publicacion)} ${fechaCorta(c.fecha_publicacion)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h3 className="text-lg font-semibold text-foreground">{c.titulo}</h3>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg p-1 text-muted hover:text-foreground cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controles de campaña, duración y visibilidad (solo admin) */}
        {guardar && (
          <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border bg-surface-alt/60 p-3.5">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Campaña / Jornada
              <input
                defaultValue={c.campana ?? ""}
                placeholder="Ej. Black Week"
                onBlur={(e) => e.target.value.trim() !== (c.campana ?? "") && guardar(c.id, "campana", e.target.value.trim())}
                className="text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Duración
              <input
                defaultValue={c.duracion ?? ""}
                placeholder="Ej. 30–40 s"
                onBlur={(e) => e.target.value.trim() !== (c.duracion ?? "") && guardar(c.id, "duracion", e.target.value.trim())}
                className="text-xs"
              />
            </label>
            <div className="flex flex-col justify-center gap-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={c.visible_cliente !== false}
                  onChange={(e) => guardar(c.id, "visible_cliente", e.target.checked)}
                />
                <span className="inline-flex items-center gap-1">
                  <Eye size={13} /> Visible al cliente
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={c.guion_visible_cliente === true}
                  onChange={(e) => guardar(c.id, "guion_visible_cliente", e.target.checked)}
                />
                <span>Mostrar guion al cliente</span>
              </label>
            </div>
          </div>
        )}

        {/* Bloque de Aprobación 1 clic */}
        {onAprobar ? (
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              borderColor: `color-mix(in srgb, ${acento} 38%, var(--border))`,
              backgroundColor: `color-mix(in srgb, ${acento} 7%, var(--surface-alt))`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Tu revisión de esta pieza
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={tinte(APROBACION_COLOR[estadoAprob])}
              >
                {APROBACION_LABEL[estadoAprob]}
              </span>
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Comentario opcional o ajuste que quieras pedir…"
              className="w-full text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={enviandoAprob}
                onClick={() => enviarAprobacion("aprobado")}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle size={14} weight="fill" />
                <span>Aprobar pieza</span>
              </button>
              <button
                type="button"
                disabled={enviandoAprob}
                onClick={() => enviarAprobacion("cambios")}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/40 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer"
              >
                <WarningCircle size={14} weight="fill" />
                <span>Pedir ajuste</span>
              </button>
            </div>
          </div>
        ) : (
          c.comentario_cliente && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs">
              <p className="font-semibold text-amber-700">
                Comentario del cliente ({APROBACION_LABEL[estadoAprob]}):
              </p>
              <p className="mt-1 text-foreground whitespace-pre-wrap">{c.comentario_cliente}</p>
            </div>
          )
        )}

        {/* Copy / Descripción ejecutiva */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              {editable ? "Resumen / Copy" : "Qué hacemos / Copy"}
            </span>
            {c.copy && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(c.copy ?? "");
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 1500);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground cursor-pointer"
              >
                <Copy size={12} />
                {copiado ? "Copiado" : "Copiar"}
              </button>
            )}
          </div>
          {guardar ? (
            <textarea
              defaultValue={c.copy ?? ""}
              rows={4}
              onBlur={(e) => e.target.value !== (c.copy ?? "") && guardar(c.id, "copy", e.target.value)}
              className="w-full text-sm leading-relaxed"
              placeholder="Resumen visible para el cliente o copy del post…"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{c.copy || "—"}</p>
          )}
        </div>

        {/* Guion estructurado */}
        {mostrarGuion && (editable || c.gancho || c.cuerpo || c.cta) && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-alt/55 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: acentoInk }}>
                Guion estructurado
              </span>
              {editable && !c.guion_visible_cliente && (
                <span className="text-[10px] uppercase tracking-wider text-muted">Solo interno ASYGNUZ</span>
              )}
            </div>
            {(["gancho", "cuerpo", "cta"] as const).map((campo) => {
              const etiqueta =
                campo === "gancho" ? "Gancho (aperturas)" : campo === "cuerpo" ? "Cuerpo" : "Cierre / CTA";
              const valor = c[campo] ?? "";
              if (!guardar && !valor) return null;
              return (
                <div key={campo} className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted">{etiqueta}</span>
                  {guardar ? (
                    <textarea
                      defaultValue={valor}
                      rows={campo === "cuerpo" ? 4 : 2}
                      onBlur={(e) => e.target.value !== valor && guardar(c.id, campo, e.target.value)}
                      className="w-full text-xs leading-relaxed"
                    />
                  ) : (
                    <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">{valor}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Notas */}
        {(guardar || c.notas) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">Notas</span>
            {guardar ? (
              <textarea
                defaultValue={c.notas ?? ""}
                rows={2}
                onBlur={(e) => e.target.value !== (c.notas ?? "") && guardar(c.id, "notas", e.target.value)}
                className="w-full text-xs"
                placeholder="Tomas clave, música, referencias…"
              />
            ) : (
              <p className="text-xs whitespace-pre-wrap text-muted">{c.notas}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Enlace url={c.link_drive} texto="Abrir en Drive" guardar={guardar && ((v) => guardar(c.id, "link_drive", v))} />
          <Enlace url={c.link_referencia} texto="Referencia" guardar={guardar && ((v) => guardar(c.id, "link_referencia", v))} />
          <Enlace url={c.link} texto="Ver post" guardar={guardar && ((v) => guardar(c.id, "link", v))} />
          {c.link_drive && (
            <a
              href={c.link_drive}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground ml-auto"
            >
              <DownloadSimple size={13} /> Material
            </a>
          )}
        </div>

        {onBorrar && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`¿Borrar "${c.titulo}" de la parrilla?`)) return;
              await onBorrar(c.id);
              cerrar();
            }}
            className="inline-flex items-center gap-1.5 self-start text-xs text-danger hover:underline cursor-pointer"
          >
            <Trash size={13} />
            <span>Borrar publicación</span>
          </button>
        )}
      </div>
    </div>
  );
}
