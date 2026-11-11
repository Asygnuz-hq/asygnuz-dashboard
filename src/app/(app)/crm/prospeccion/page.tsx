"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ETAPAS, ETAPAS_CON_PERDIDO, type LeadProspeccion, type Prospeccion } from "@/lib/espocrm/prospeccion";

const CRM_URL = "https://crm.asygnuz.com/#Lead/view/";
const BTN = "text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt disabled:opacity-50";
const BTN_PRIMARIO = "text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50";

// Solo los celulares colombianos (3xx, 10 dígitos) tienen WhatsApp; los fijos 60x se llaman.
function celular(tel: string | null): string | null {
  const d = (tel ?? "").replace(/\D/g, "").replace(/^57/, "");
  return /^3\d{9}$/.test(d) ? d : null;
}

function nombreCorto(l: LeadProspeccion): string {
  const n = l.accountName || l.name;
  return (n.split(/\s[/|·–-]\s/).map((x) => x.trim()).find((x) => x.length >= 12) ?? n).slice(0, 60);
}

function diasDesde(fechaUtc: string | null): number | null {
  if (!fechaUtc) return null;
  return Math.floor((Date.now() - new Date(fechaUtc.replace(" ", "T") + "Z").getTime()) / 86400_000);
}

// Secuencia de la estrategia: día 1 WhatsApp · día 3 nota de voz · día 7 correo · día 14 último seguimiento.
function siguientePaso(dias: number | null): string {
  if (dias === null) return "";
  if (dias < 3) return `Día ${dias + 1}: esperar respuesta`;
  if (dias < 7) return "Toca nota de voz (día 3)";
  if (dias < 14) return "Toca correo (día 7)";
  return "Último seguimiento (día 14) o marcar Perdido";
}

export default function ProspeccionPage() {
  const [datos, setDatos] = useState<Prospeccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"cola" | "curso">("cola");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/espocrm/prospeccion", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? `HTTP ${res.status}`);
    setError(null);
    setDatos(json);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiar(id: string, cambio: { cEtapa?: string; cTienePauta?: string }) {
    setGuardando(id);
    const res = await fetch("/api/espocrm/prospeccion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...cambio }),
    });
    const json = await res.json().catch(() => ({}));
    setGuardando(null);
    if (!res.ok) return setError(json.error ?? `HTTP ${res.status}`);
    await cargar();
  }

  const lista = pestana === "cola" ? datos?.cola : datos?.enCurso;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prospección"
        subtitle="Clínicas odontológicas y estéticas calificadas A/B/C. Envía desde tu WhatsApp, revisa el mensaje antes y marca cada paso."
      />

      {error && <p className="text-sm text-danger">No se pudo leer o guardar en EspoCRM: {error}</p>}
      {!datos && !error && <p className="text-sm text-muted">Cargando prospectos…</p>}

      {datos && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="En la cola" value={String(datos.cola.length)} count={datos.cola.length} hint="A y B sin contactar" />
            <KpiCard label="Contactados hoy" value={String(datos.contactadosHoy)} count={datos.contactadosHoy} hint={`${datos.contactadosSemana} en 7 días`} />
            <KpiCard label="En conversación" value={String(datos.enCurso.length)} count={datos.enCurso.length} hint="Contactados sin cerrar" />
            <KpiCard label="Por calificar" value={String(datos.pendientesCalificar)} count={datos.pendientesCalificar} hint="El robot los procesa cada 30 min" />
          </div>

          <section className="glass rounded-2xl border p-4 overflow-x-auto">
            <h2 className="font-display text-lg mb-3">Embudo por nivel</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-3 py-2">Nivel</th>
                  <th className="text-right px-3 py-2">Calificados</th>
                  {ETAPAS.map((e) => (
                    <th key={e} className="text-right px-3 py-2">{e}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.embudo.map((f) => (
                  <tr key={f.nivel}>
                    <td className="px-3 py-2 border-b border-border font-medium">{f.nivel}</td>
                    <td className="text-right px-3 py-2 border-b border-border">{f.calificados}</td>
                    {ETAPAS.map((e, i) => {
                      const base = i === 0 ? f.calificados : f.porEtapa[ETAPAS[i - 1]];
                      const pct = base ? Math.round((f.porEtapa[e] / base) * 100) : null;
                      return (
                        <td key={e} className="text-right px-3 py-2 border-b border-border">
                          {f.porEtapa[e]}
                          {pct !== null && f.porEtapa[e] > 0 && <span className="text-muted text-xs"> ({pct}%)</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-2">El % es contra la etapa anterior. Saquen conclusiones después de 10–20 conversaciones calificadas.</p>
          </section>

          <div className="flex gap-2" role="tablist">
            <button role="tab" aria-selected={pestana === "cola"} className={pestana === "cola" ? BTN_PRIMARIO : BTN} onClick={() => setPestana("cola")}>
              Cola de hoy ({datos.cola.length})
            </button>
            <button role="tab" aria-selected={pestana === "curso"} className={pestana === "curso" ? BTN_PRIMARIO : BTN} onClick={() => setPestana("curso")}>
              En conversación ({datos.enCurso.length})
            </button>
          </div>

          {lista?.length === 0 && <p className="text-sm text-muted">No hay prospectos aquí por ahora.</p>}

          <div className="flex flex-col gap-4">
            {lista?.map((l) => (
              <TarjetaLead key={l.id} lead={l} enCola={pestana === "cola"} ocupado={guardando === l.id} cambiar={cambiar} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaLead({
  lead: l,
  enCola,
  ocupado,
  cambiar,
}: {
  lead: LeadProspeccion;
  enCola: boolean;
  ocupado: boolean;
  cambiar: (id: string, cambio: { cEtapa?: string; cTienePauta?: string }) => Promise<void>;
}) {
  const [mensaje, setMensaje] = useState(l.cMensaje ?? "");
  const cel = celular(l.phoneNumber);
  const dias = diasDesde(l.cContactadoEn);

  return (
    <article className="glass rounded-2xl border p-4 flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${l.cNivel === "A" ? "bg-accent text-accent-foreground" : "border border-border"}`}>
          {l.cNivel} · {l.cPuntaje} pts
        </span>
        <a href={CRM_URL + l.id} target="_blank" rel="noreferrer" className="font-display text-lg hover:underline">
          {nombreCorto(l)}
        </a>
        <span className="text-sm text-muted">
          {l.cNicho}
          {l.cRating ? ` · ⭐ ${l.cRating} (${l.cResenas} reseñas)` : ""}
          {l.website ? <> · <a className="underline" href={l.website} target="_blank" rel="noreferrer">web</a></> : ""}
          {l.cInstagram ? <> · <a className="underline" href={l.cInstagram} target="_blank" rel="noreferrer">Instagram</a></> : ""}
        </span>
        {!enCola && (
          <span className="text-sm ml-auto">
            <strong>{l.cEtapa}</strong>
            {dias !== null && <span className="text-muted"> · {siguientePaso(dias)}</span>}
          </span>
        )}
      </header>

      {l.cHallazgos && <p className="text-sm whitespace-pre-line text-muted">{l.cHallazgos}</p>}

      {enCola && (
        <label className="flex flex-col gap-1 text-sm">
          Mensaje (edítalo antes de enviar)
          <textarea
            className="rounded-md border border-border bg-transparent p-2 text-sm min-h-28"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {cel ? (
          <a className={BTN_PRIMARIO} href={`https://wa.me/57${cel}${enCola ? `?text=${encodeURIComponent(mensaje)}` : ""}`} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        ) : (
          <span className="text-sm text-muted">{l.phoneNumber ? `Fijo, llamar: ${l.phoneNumber}` : "Sin teléfono"}</span>
        )}

        {l.cLinkAnuncios && (
          <a className={BTN} href={l.cLinkAnuncios} target="_blank" rel="noreferrer">
            Ver anuncios
          </a>
        )}
        <span className="text-sm text-muted">Pauta:</span>
        {(["Sí", "No"] as const).map((v) => (
          <button
            key={v}
            disabled={ocupado}
            aria-pressed={l.cTienePauta === v}
            className={l.cTienePauta === v ? BTN_PRIMARIO : BTN}
            onClick={() => cambiar(l.id, { cTienePauta: v })}
          >
            {v}
          </button>
        ))}

        <span className="flex-1" />
        {enCola ? (
          <>
            <button disabled={ocupado} className={BTN} onClick={() => cambiar(l.id, { cEtapa: "Perdido" })}>
              Descartar
            </button>
            <button disabled={ocupado} className={BTN_PRIMARIO} onClick={() => cambiar(l.id, { cEtapa: "Contactado" })}>
              {ocupado ? "Guardando…" : "Marcar contactado"}
            </button>
          </>
        ) : (
          <select
            disabled={ocupado}
            aria-label="Cambiar etapa"
            className="text-sm rounded-md border border-border bg-transparent px-2 py-1.5"
            value={l.cEtapa ?? ""}
            onChange={(e) => cambiar(l.id, { cEtapa: e.target.value })}
          >
            {ETAPAS_CON_PERDIDO.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        )}
      </div>
    </article>
  );
}
