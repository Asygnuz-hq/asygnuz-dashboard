"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ESTADOS_LEAD } from "@/lib/leads/schemas";

type Lead = {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  oferta: string | null;
  origen: string | null;
  utm: Record<string, string>;
  estado: string;
  creado_en: string;
};

export default function LeadsAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal-admin/clientes/${tenantId}/leads`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        setLeads(data.leads);
      })
      .catch((e: Error) => setError(e.message));
  }, [tenantId]);

  async function cambiarEstado(id: string, estado: string) {
    setError(null);
    const res = await fetch(`/api/portal-admin/clientes/${tenantId}/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo actualizar.");
      return;
    }
    setLeads((actual) => actual?.map((l) => (l.id === id ? { ...l, estado } : l)) ?? null);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Leads de la web" />
      <Link href={`/portal-admin/${tenantId}`} className="text-sm underline w-fit">
        ← Volver al portal
      </Link>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {!leads && !error && <p className="text-sm text-muted">Cargando…</p>}
      {leads?.length === 0 && <p className="text-sm text-muted">Todavía no hay leads.</p>}
      <div className="flex flex-col gap-3">
        {leads?.map((l) => (
          <article key={l.id} className="glass rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{l.nombre}</h2>
                <a href={`mailto:${l.email}`} className="text-sm underline">{l.email}</a>
              </div>
              <select
                aria-label={`Estado de ${l.nombre}`}
                value={l.estado}
                onChange={(e) => cambiarEstado(l.id, e.target.value)}
                className="p-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground"
              >
                {ESTADOS_LEAD.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <p className="text-sm font-medium">{l.asunto}</p>
            <p className="text-sm whitespace-pre-wrap text-muted">{l.mensaje}</p>
            <p className="text-xs text-muted">
              {[new Date(l.creado_en).toLocaleString("es-CO"), l.oferta, l.origen, ...Object.entries(l.utm).map(([k, v]) => `${k}: ${v}`)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
