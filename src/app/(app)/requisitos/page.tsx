"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  borrarRequisito,
  cargarCatalogos,
  cargarHistorias,
  cargarRequisitos,
  ESTADO_TRAZABILIDAD_COLOR,
  ESTADOS_TRAZABILIDAD,
  type Historia,
  type OpcionSimple,
  type Requisito,
  siguienteCodigoHistoria,
} from "@/lib/requisitos";
import { HistoriaForm } from "./HistoriaForm";
import { RequisitoForm } from "./RequisitoForm";

const ESTADO_HISTORIA_COLOR: Record<string, string> = {
  Borrador: "#8b93a6",
  "En Revisión": "#c9a227",
  Aprobada: "#3c5e99",
  "En Desarrollo": "#7c5cbf",
  Lista: "#1d9e75",
};

function labelTrazabilidad(v: string) {
  return ESTADOS_TRAZABILIDAD.find((e) => e.value === v)?.label ?? v;
}

function HistoriasDeRequisito({
  requisitoId,
  equipoVacio,
  refreshKey,
}: {
  requisitoId: string;
  equipoVacio: boolean;
  refreshKey: number;
}) {
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Historia | null>(null);
  const [creando, setCreando] = useState(false);
  const [localKey, setLocalKey] = useState(0);

  const recargar = useCallback(async () => {
    setLoading(true);
    setHistorias(await cargarHistorias(requisitoId));
    setLoading(false);
  }, [requisitoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar, refreshKey, localKey]);

  return (
    <div className="flex flex-col gap-2 pl-4 border-l-2 border-border ml-1 mt-2">
      {loading && <p className="text-xs text-muted">Cargando historias…</p>}
      {!loading && historias.length === 0 && (
        <p className="text-xs text-muted">Sin historias de usuario todavía.</p>
      )}
      {historias.map((h) => (
        <button
          key={h.id}
          onClick={() => setEditando(h)}
          className="text-left rounded-md border border-border bg-background p-2.5 hover:border-accent-bright/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">{h.codigo}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${ESTADO_HISTORIA_COLOR[h.estado] ?? "#8b93a6"}22`,
                color: ESTADO_HISTORIA_COLOR[h.estado] ?? "#8b93a6",
              }}
            >
              {h.estado}
            </span>
          </div>
          {(h.quiero || h.como) && (
            <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
              <span className="text-muted">Como</span> {h.como} —{" "}
              <span className="text-muted">quiero</span> {h.quiero}
            </p>
          )}
        </button>
      ))}

      <button
        onClick={() => setCreando(true)}
        className="text-xs text-accent-bright font-medium self-start mt-1"
      >
        + Nueva Historia de Usuario
      </button>

      {equipoVacio && historias.length === 0 && (
        <p className="text-[10px] text-muted">
          Tip: agrega personas en Equipo para poder asignar responsables.
        </p>
      )}

      {creando && (
        <HistoriaForm
          requisitoId={requisitoId}
          historia={null}
          codigoSugerido={siguienteCodigoHistoria(historias)}
          onClose={() => setCreando(false)}
          onSaved={() => {
            setCreando(false);
            setLocalKey((k) => k + 1);
          }}
        />
      )}
      {editando && (
        <HistoriaForm
          requisitoId={requisitoId}
          historia={editando}
          codigoSugerido={editando.codigo}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            setLocalKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

export default function RequisitosPage() {
  const [clientes, setClientes] = useState<OpcionSimple[]>([]);
  const [equipo, setEquipo] = useState<OpcionSimple[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [creandoReq, setCreandoReq] = useState(false);
  const [editandoReq, setEditandoReq] = useState<Requisito | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    cargarCatalogos().then(({ clientes, equipo }) => {
      setClientes(clientes);
      setEquipo(equipo);
      if (clientes.length > 0) setClienteId(clientes[0].id);
    });
  }, []);

  const recargar = useCallback(async () => {
    if (!clienteId) {
      setRequisitos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setRequisitos(await cargarRequisitos(clienteId));
    setLoading(false);
  }, [clienteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  async function eliminarReq(r: Requisito) {
    if (!confirm(`¿Eliminar el Requisito #${r.numero} y todas sus historias?`)) return;
    await borrarRequisito(r.id);
    recargar();
  }

  const responsableNombre = (id: string | null) =>
    id ? (equipo.find((p) => p.id === id)?.nombre ?? "—") : "(Sin asignar)";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Requisitos de Negocio"
          subtitle="Levantamiento de requisitos e historias de usuario por cliente — el insumo que se pasa al equipo técnico."
        />
        <div className="flex items-center gap-2">
          {clientes.length > 0 && (
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="text-sm rounded-md border border-border bg-surface px-3 py-1.5"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setCreandoReq(true)}
            disabled={!clienteId}
            className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 disabled:opacity-50"
          >
            + Nuevo Requisito
          </button>
        </div>
      </div>

      {clientes.length === 0 && (
        <p className="text-sm text-muted">
          No hay clientes todavía. Crea uno en la sección Clientes para empezar a levantar requisitos.
        </p>
      )}

      {loading && clienteId && <p className="text-sm text-muted">Cargando requisitos…</p>}

      {!loading && clienteId && requisitos.length === 0 && (
        <p className="text-sm text-muted">
          Este cliente no tiene requisitos todavía. Dale a “+ Nuevo Requisito”.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {requisitos.map((r) => {
          const abierto = expandido === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted">REQ-{r.numero}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${ESTADO_TRAZABILIDAD_COLOR[r.estado_trazabilidad]}22`,
                          color: ESTADO_TRAZABILIDAD_COLOR[r.estado_trazabilidad],
                        }}
                      >
                        {labelTrazabilidad(r.estado_trazabilidad)}
                      </span>
                      <span className="text-[10px] text-muted">Prioridad {r.prioridad}</span>
                      {r.fase_implementacion && (
                        <span className="text-[10px] text-muted">· {r.fase_implementacion}</span>
                      )}
                      {r.plataforma_software && (
                        <span className="text-[10px] text-muted">· {r.plataforma_software}</span>
                      )}
                    </div>
                    <p className="text-sm mt-1.5">{r.descripcion}</p>
                    <p className="text-xs text-muted mt-1">
                      Responsable: {responsableNombre(r.responsable_id)}
                      {r.fecha_inicio && ` · ${r.fecha_inicio}`}
                      {r.fecha_fin && ` → ${r.fecha_fin}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditandoReq(r)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarReq(r)}
                      className="text-xs text-danger/70 hover:text-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>Meta {r.pct_planificado}%</span>
                    <span>Real {r.pct_ejecutado}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-background overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent-bright/30"
                      style={{ width: `${Math.min(100, r.pct_planificado)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-success"
                      style={{ width: `${Math.min(100, r.pct_ejecutado)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setExpandido(abierto ? null : r.id)}
                  className="text-xs text-accent-bright font-medium self-start"
                >
                  {abierto ? "▾ Ocultar historias de usuario" : "▸ Ver historias de usuario"}
                </button>

                {abierto && (
                  <HistoriasDeRequisito
                    requisitoId={r.id}
                    equipoVacio={equipo.length === 0}
                    refreshKey={refreshKey}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {creandoReq && clienteId && (
        <RequisitoForm
          clienteId={clienteId}
          requisito={null}
          equipo={equipo}
          onClose={() => setCreandoReq(false)}
          onSaved={() => {
            setCreandoReq(false);
            recargar();
          }}
        />
      )}
      {editandoReq && clienteId && (
        <RequisitoForm
          clienteId={clienteId}
          requisito={editandoReq}
          equipo={equipo}
          onClose={() => setEditandoReq(null)}
          onSaved={() => {
            setEditandoReq(null);
            recargar();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
