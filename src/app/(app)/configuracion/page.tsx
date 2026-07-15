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
  const [message, setMessage] = useState<string | null>(null);

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
        subtitle="TRM del día, mes activo y metas mensuales del dashboard financiero."
      />
      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xs">
        <label className="flex flex-col gap-1 text-sm">
          TRM del día (COP/USD)
          <input type="number" step="any" value={trm} onChange={(e) => setTrm(e.target.value)} required />
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
