"use client";

// Parrilla de contenido tipo hoja de cálculo + calendario. La usan las dos
// pantallas: /portal-admin/[tenantId]/parrilla (editable, ASYGNUZ) y
// /portal/parrilla (solo lectura, el cliente) — mismo componente a
// propósito, para que lo que JM arma se vea igual a lo que el cliente recibe.
//
// Los inputs llevan el fondo/borde por `style` y no por clases: el CSS global
// de input/select/textarea no está en una capa de Tailwind, así que le gana a
// utilidades como bg-transparent.

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import {
  CANALES,
  FORMATOS,
  PILARES,
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

type Props = {
  contenido: Contenido[];
  editable: boolean;
  onActualizar?: (id: string, campo: keyof Contenido, valor: string) => Promise<void>;
  onAgregar?: (fecha: string) => Promise<void>;
  onBorrar?: (id: string) => Promise<void>;
};

const SIN_BORDE: CSSProperties = { background: "transparent", borderColor: "transparent" };

// Radio y padding por style: el CSS global de select (sin capa) le gana a rounded-full.
const PILDORA: CSSProperties = { borderRadius: 999, padding: "2px 10px" };

function tinte(color: string): CSSProperties {
  return { ...PILDORA, background: `color-mix(in srgb, ${color} 18%, transparent)`, color, borderColor: "transparent" };
}

export default function ParrillaVista({ contenido, editable, onActualizar, onAgregar, onBorrar }: Props) {
  const [vista, setVista] = useState<"tabla" | "calendario">("tabla");
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<string>("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const canales = useMemo(
    () => Array.from(new Set([...Object.keys(CANALES), ...contenido.map((c) => c.plataforma).filter(Boolean)])) as string[],
    [contenido]
  );

  const filtrado = useMemo(
    () =>
      contenido
        .filter((c) => !filtroEstado || c.estado === filtroEstado)
        .filter((c) => !filtroCanal || c.plataforma === filtroCanal)
        .sort(ordenar),
    [contenido, filtroEstado, filtroCanal]
  );

  const seleccionado = contenido.find((c) => c.id === abierto) ?? null;
  const guardar = editable && onActualizar ? onActualizar : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra: vista + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass rounded-full p-1 flex gap-1">
          {(["tabla", "calendario"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                vista === v ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {v === "tabla" ? "▤ Tabla" : "▦ Calendario"}
            </button>
          ))}
        </div>
        <select value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)} className="text-xs rounded-full">
          <option value="">Todos los canales</option>
          {canales.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          <BotonFiltro activo={filtroEstado === null} onClick={() => setFiltroEstado(null)}>
            Todas · {contenido.length}
          </BotonFiltro>
          {ESTADOS_CONTENIDO.map((e) => {
            const n = contenido.filter((c) => c.estado === e).length;
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

      {vista === "tabla" ? (
        <Tabla filas={filtrado} guardar={guardar} abrir={setAbierto} onAgregar={editable ? onAgregar : undefined} />
      ) : (
        <Calendario filas={filtrado} abrir={setAbierto} />
      )}

      {seleccionado && (
        <Detalle
          c={seleccionado}
          guardar={guardar}
          onBorrar={editable ? onBorrar : undefined}
          cerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

function BotonFiltro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1.5 ${
        activo ? "border-accent-bright bg-surface-alt" : "border-border text-muted"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- tabla

const COLUMNAS = ["Canal", "Día", "Fecha", "Hora", "Estado", "Pilar", "Formato", "Pieza", "Copy", "Contenido", "Publicación"];

function Tabla({
  filas,
  guardar,
  abrir,
  onAgregar,
}: {
  filas: Contenido[];
  guardar?: Props["onActualizar"];
  abrir: (id: string) => void;
  onAgregar?: (fecha: string) => Promise<void>;
}) {
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
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-sm min-w-[1180px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-border">
            {COLUMNAS.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.length === 0 && (
            <tr>
              <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-muted">
                No hay publicaciones con estos filtros.
              </td>
            </tr>
          )}
          {semanas.map((s) => (
            <SemanaFilas key={s.clave} clave={s.clave} filas={s.filas} guardar={guardar} abrir={abrir} />
          ))}
        </tbody>
      </table>
      {onAgregar && (
        <button
          onClick={() => onAgregar(iso(new Date()))}
          className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-surface-alt/60 border-t border-border"
        >
          + Nueva publicación
        </button>
      )}
    </div>
  );
}

function SemanaFilas({
  clave,
  filas,
  guardar,
  abrir,
}: {
  clave: string;
  filas: Contenido[];
  guardar?: Props["onActualizar"];
  abrir: (id: string) => void;
}) {
  let titulo = "Sin fecha";
  if (clave !== "sin-fecha") {
    const fin = fechaLocal(clave);
    fin.setDate(fin.getDate() + 6);
    titulo = `Semana del ${fechaCorta(clave)} al ${fechaCorta(iso(fin))}`;
  }
  return (
    <>
      <tr className="bg-surface-alt/50">
        <td colSpan={COLUMNAS.length} className="px-3 py-1.5 text-xs font-semibold text-muted">
          {titulo} · {filas.length} {filas.length === 1 ? "publicación" : "publicaciones"}
        </td>
      </tr>
      {filas.map((c) => (
        <Fila key={c.id} c={c} guardar={guardar} abrir={abrir} />
      ))}
    </>
  );
}

function Fila({ c, guardar, abrir }: { c: Contenido; guardar?: Props["onActualizar"]; abrir: (id: string) => void }) {
  const g = (campo: keyof Contenido) => (valor: string) => guardar?.(c.id, campo, valor);
  return (
    <tr className="border-b border-border/60 hover:bg-surface-alt/40 align-middle">
      <td className="px-3 py-2">
        <ChipSelect valor={c.plataforma} catalogo={CANALES} guardar={guardar && g("plataforma")} vacio="Canal" />
      </td>
      <td className="px-3 py-2 text-muted whitespace-nowrap">{diaCorto(c.fecha_publicacion)}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        {guardar ? (
          <input
            type="date"
            defaultValue={c.fecha_publicacion ?? ""}
            onChange={(e) => g("fecha_publicacion")(e.target.value)}
            className="text-sm"
            style={SIN_BORDE}
          />
        ) : (
          fechaCorta(c.fecha_publicacion)
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {guardar ? (
          <input
            type="time"
            defaultValue={c.hora?.slice(0, 5) ?? ""}
            onBlur={(e) => e.target.value !== (c.hora?.slice(0, 5) ?? "") && g("hora")(e.target.value)}
            className="text-sm"
            style={SIN_BORDE}
          />
        ) : (
          horaCorta(c.hora)
        )}
      </td>
      <td className="px-3 py-2">
        <ChipEstado valor={c.estado} guardar={guardar && g("estado")} />
      </td>
      <td className="px-3 py-2">
        <ChipSelect valor={c.pilar} catalogo={PILARES} guardar={guardar && g("pilar")} vacio="Pilar" />
      </td>
      <td className="px-3 py-2">
        <ChipSelect valor={c.tipo} catalogo={FORMATOS} guardar={guardar && g("tipo")} vacio="Formato" />
      </td>
      <td className="px-3 py-2 min-w-[230px]">
        {guardar ? (
          <TextoCelda valor={c.titulo} guardar={g("titulo")} className="font-medium" />
        ) : (
          <span className="font-medium">{c.titulo}</span>
        )}
      </td>
      <td className="px-3 py-2 max-w-[260px]">
        <button onClick={() => abrir(c.id)} className="text-left text-xs text-muted hover:text-foreground line-clamp-2">
          {c.copy || (guardar ? "+ Escribir copy" : "—")}
        </button>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Enlace url={c.link_drive} texto="Abrir en Drive" guardar={guardar && g("link_drive")} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Enlace url={c.link} texto="Ver post" guardar={guardar && g("link")} />
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
  const color = ESTADO_COLOR[valor] ?? "var(--muted)";
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

function TextoCelda({ valor, guardar, className }: { valor: string; guardar: (v: string) => void; className?: string }) {
  return (
    <input
      defaultValue={valor}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== valor) guardar(v);
        else e.target.value = valor;
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`w-full text-sm ${className ?? ""}`}
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
        className="text-xs w-44"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {!url && guardar ? (
        <button onClick={() => setEditando(true)} className="text-xs text-muted hover:text-foreground">
          + {texto}
        </button>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold border border-border hover:border-accent-bright"
        >
          {texto} ↗
        </a>
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
      {guardar && url && (
        <button onClick={() => setEditando(true)} className="text-xs text-muted hover:text-foreground" title="Editar enlace">
          ✎
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
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center justify-between px-1 pb-3">
        <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} className="text-muted hover:text-foreground px-2">
          ←
        </button>
        <span className="text-sm font-semibold">{titulo}</span>
        <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} className="text-muted hover:text-foreground px-2">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {DIAS.map((d) => (
          <div key={d} className="bg-surface px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted font-semibold">
            {d}
          </div>
        ))}
        {celdas.map((d) => {
          const clave = iso(d);
          const delMes = d.getMonth() === mes.getMonth();
          return (
            <div key={clave} className={`bg-surface min-h-[104px] p-1.5 flex flex-col gap-1 ${delMes ? "" : "opacity-40"}`}>
              <span
                className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                  clave === hoy ? "bg-accent text-accent-foreground font-semibold" : "text-muted"
                }`}
              >
                {d.getDate()}
              </span>
              {(porDia[clave] ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => abrir(c.id)}
                  className="text-left rounded-md px-1.5 py-1 text-[11px] leading-tight hover:brightness-125"
                  style={{ background: `color-mix(in srgb, ${colorDe(FORMATOS, c.tipo)} 16%, transparent)` }}
                >
                  <span className="flex items-center gap-1 font-semibold" style={{ color: colorDe(FORMATOS, c.tipo) }}>
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: colorDe(CANALES, c.plataforma) }} />
                    {c.tipo ?? "Pieza"}
                    {c.hora && <span className="text-muted font-normal">· {horaCorta(c.hora)}</span>}
                  </span>
                  <span className="block truncate text-foreground">{c.titulo}</span>
                </button>
              ))}
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
  guardar,
  onBorrar,
  cerrar,
}: {
  c: Contenido;
  guardar?: Props["onActualizar"];
  onBorrar?: (id: string) => Promise<void>;
  cerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={cerrar}>
      <div
        className="glass rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">
              {[c.plataforma, c.tipo, c.fecha_publicacion && `${diaCorto(c.fecha_publicacion)} ${fechaCorta(c.fecha_publicacion)}`, horaCorta(c.hora)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h3 className="font-semibold mt-0.5">{c.titulo}</h3>
          </div>
          <button onClick={cerrar} className="text-muted hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">Copy</span>
            {c.copy && (
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(c.copy ?? "");
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 1500);
                }}
                className="text-xs text-muted hover:text-foreground"
              >
                {copiado ? "Copiado ✓" : "Copiar"}
              </button>
            )}
          </div>
          {guardar ? (
            <textarea
              defaultValue={c.copy ?? ""}
              rows={8}
              onBlur={(e) => e.target.value !== (c.copy ?? "") && guardar(c.id, "copy", e.target.value)}
              className="w-full text-sm leading-relaxed"
              placeholder="Texto del post, hashtags…"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.copy || "—"}</p>
          )}
        </div>

        {(guardar || c.notas) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">Notas</span>
            {guardar ? (
              <textarea
                defaultValue={c.notas ?? ""}
                rows={3}
                onBlur={(e) => e.target.value !== (c.notas ?? "") && guardar(c.id, "notas", e.target.value)}
                className="w-full text-sm"
                placeholder="Indicaciones internas, música, referencias…"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted">{c.notas}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Enlace url={c.link_drive} texto="Abrir en Drive" guardar={guardar && ((v) => guardar(c.id, "link_drive", v))} />
          <Enlace url={c.link_referencia} texto="Referencia" guardar={guardar && ((v) => guardar(c.id, "link_referencia", v))} />
          <Enlace url={c.link} texto="Ver post" guardar={guardar && ((v) => guardar(c.id, "link", v))} />
        </div>

        {onBorrar && (
          <button
            onClick={async () => {
              if (!confirm(`¿Borrar "${c.titulo}" de la parrilla?`)) return;
              await onBorrar(c.id);
              cerrar();
            }}
            className="self-start text-xs text-danger hover:underline"
          >
            Borrar publicación
          </button>
        )}
      </div>
    </div>
  );
}
