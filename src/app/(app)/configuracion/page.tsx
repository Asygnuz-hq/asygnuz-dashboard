"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";

export default function ConfiguracionPage() {
  const [trm, setTrm] = useState("");
  const [mesActivo, setMesActivo] = useState("");
  const [metaIngresos, setMetaIngresos] = useState("");
  const [metaMargen, setMetaMargen] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingTrm, setFetchingTrm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFetchTrm() {
    setFetchingTrm(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trm?fecha=${new Date().toISOString().slice(0, 10)}`);
      const data = await res.json();
      const valor = data?.valor;
      if (valor) {
        setTrm(String(Math.round(valor)));
        setMessage(`TRM oficial (Banco de la República) de hoy: ${Math.round(valor).toLocaleString("es-CO")}. Revisa y dale Guardar.`);
      } else {
        setMessage("No se pudo leer la TRM oficial. Intenta de nuevo.");
      }
    } catch {
      setMessage("No se pudo conectar al servicio de TRM. Intenta de nuevo.");
    }
    setFetchingTrm(false);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("configuracion").select("*").eq("id", 1).single();
      if (data) {
        setTrm(String(data.trm_actual ?? ""));
        setMesActivo(data.mes_activo ?? "");
        setMetaIngresos(String(data.meta_ingresos_cop ?? ""));
        setMetaMargen(String(data.meta_margen_pct ? data.meta_margen_pct * 100 : ""));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("configuracion")
      .update({
        trm_actual: Number(trm),
        mes_activo: mesActivo,
        meta_ingresos_cop: Number(metaIngresos) || 0,
        meta_margen_pct: (Number(metaMargen) || 0) / 100,
      })
      .eq("id", 1);
    setSaving(false);
    setMessage(error ? error.message : "Guardado.");
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="TRM oficial (se actualiza sola cada día), mes activo y metas mensuales del dashboard financiero."
      />
      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xs">
        <label className="flex flex-col gap-1 text-sm">
          TRM del día (COP/USD)
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={trm}
              onChange={(e) => setTrm(e.target.value)}
              required
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleFetchTrm}
              disabled={fetchingTrm}
              className="rounded-md border border-border bg-surface-alt px-2 text-xs text-muted hover:text-foreground disabled:opacity-60"
            >
              {fetchingTrm ? "..." : "Traer del día"}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mes activo
          <input
            type="month"
            value={mesActivo.slice(0, 7)}
            onChange={(e) => setMesActivo(e.target.value ? `${e.target.value}-01` : "")}
            required
          />
        </label>
        <hr className="border-border" />
        <p className="text-xs uppercase tracking-wide text-muted">Metas del mes activo</p>
        <label className="flex flex-col gap-1 text-sm">
          Meta de ingresos (COP)
          <input
            type="number"
            step="any"
            value={metaIngresos}
            onChange={(e) => setMetaIngresos(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meta de margen (%)
          <input
            type="number"
            step="any"
            value={metaMargen}
            onChange={(e) => setMetaMargen(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
    </div>
  );
}
