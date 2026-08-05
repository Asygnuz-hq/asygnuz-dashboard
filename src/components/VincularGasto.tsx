"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Cuenta = { id: string; nombre: string; moneda: string };
export type Gasto = {
  id: string;
  moneda: string;
  monto: number;
  trm_aplicada: number | null;
  fecha: string | null;
  concepto: string;
  cuenta_id: string | null;
};

export function VincularGasto({ gasto, onDone }: { gasto: Gasto; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaNombre, setCuentaNombre] = useState<string | null>(null);
  const [cuentaId, setCuentaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gasto.cuenta_id) return;
    const supabase = createClient();
    supabase
      .from("cuentas")
      .select("nombre")
      .eq("id", gasto.cuenta_id)
      .maybeSingle()
      .then(({ data }) => setCuentaNombre((data as { nombre: string } | null)?.nombre ?? null));
  }, [gasto.cuenta_id]);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("cuentas")
        .select("id, nombre, moneda")
        .eq("activa", true)
        .eq("moneda", gasto.moneda);
      setCuentas((data as Cuenta[]) ?? []);
    }
    load();
  }, [open, gasto.moneda]);

  if (gasto.cuenta_id) {
    return <span className="text-xs text-muted mr-3">Pagado de {cuentaNombre ?? "..."}</span>;
  }

  async function handleConfirm() {
    setError(null);
    if (!cuentaId) {
      setError(`Selecciona qué cuenta ${gasto.moneda} pagó este gasto.`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("gastos_variables")
      .update({ cuenta_id: cuentaId })
      .eq("id", gasto.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    const { error: movError } = await supabase.from("movimientos_cuenta").insert({
      cuenta_id: cuentaId,
      fecha: gasto.fecha ?? new Date().toISOString().slice(0, 10),
      tipo: "Gasto",
      monto: gasto.monto,
      tasa_cambio: gasto.trm_aplicada || null,
      descripcion: gasto.concepto,
      gasto_id: gasto.id,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (movError) {
      setError(`Quedó vinculado, pero no se pudo descontar de la cuenta: ${movError.message}`);
      onDone();
      return;
    }

    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-accent-bright text-sm font-medium mr-3">
        Vincular a cuenta
      </button>
    );
  }

  return (
    <span className="relative inline-block mr-3">
      <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-border bg-surface p-3 flex flex-col gap-2 shadow-lg">
        <p className="text-xs font-medium">¿Con qué cuenta pagaste este gasto?</p>
        <label className="flex flex-col gap-1 text-xs">
          Cuenta ({gasto.moneda})
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
            <option value="" disabled>
              Selecciona
            </option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {cuentas.length === 0 && (
          <p className="text-xs text-danger">No tienes cuentas activas en {gasto.moneda}.</p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-md bg-accent text-accent-foreground text-xs font-medium px-2 py-1 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Confirmar"}
          </button>
          <button onClick={() => setOpen(false)} className="rounded-md border border-border text-xs px-2 py-1 text-muted">
            Cancelar
          </button>
        </div>
      </div>
      <button onClick={() => setOpen(false)} className="text-accent-bright text-sm font-medium">
        Vincular a cuenta
      </button>
    </span>
  );
}
