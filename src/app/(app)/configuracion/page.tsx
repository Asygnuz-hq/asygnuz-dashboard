"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";

export default function ConfiguracionPage() {
  const [trm, setTrm] = useState("");
  const [mesActivo, setMesActivo] = useState("");
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
      .update({ trm_actual: Number(trm), mes_activo: mesActivo })
      .eq("id", 1);
    setSaving(false);
    setMessage(error ? error.message : "Guardado.");
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div>
      <PageHeader title="Configuración" subtitle="TRM del día y mes activo del dashboard financiero." />
      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xs">
        <label className="flex flex-col gap-1 text-sm">
          TRM del día (COP/USD)
          <input
            type="number"
            step="any"
            value={trm}
            onChange={(e) => setTrm(e.target.value)}
            required
          />
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
