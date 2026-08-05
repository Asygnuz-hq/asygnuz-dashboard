"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Cuenta = { id: string; nombre: string; moneda: string };
export type Ingreso = { id: string; estado: string; moneda: string; monto_original: number };

export function MarcarCobrado({ ingreso, onDone }: { ingreso: Ingreso; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [cuentaId, setCuentaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("cuentas")
        .select("id, nombre, moneda")
        .eq("activa", true)
        .eq("moneda", ingreso.moneda);
      setCuentas((data as Cuenta[]) ?? []);
    }
    load();
  }, [open, ingreso.moneda]);

  if (ingreso.estado !== "Pendiente") return null;

  async function handleConfirm() {
    setError(null);
    if (!cuentaId) {
      setError(`Selecciona a qué cuenta ${ingreso.moneda} entró la plata.`);
      return;
    }
    setSaving(true);

    let trm: number | null = null;
    if (ingreso.moneda !== "COP") {
      const res = await fetch(`/api/trm?fecha=${fecha}`);
      const data = await res.json();
      trm = data?.valor ?? null;
      if (!trm) {
        setSaving(false);
        setError("No se pudo traer la TRM oficial de esa fecha. Intenta de nuevo en un momento.");
        return;
      }
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: Record<string, unknown> = {
      estado: "Cobrado",
      fecha_pago_real: fecha,
      cuenta_id: cuentaId,
    };
    if (trm !== null) updatePayload.trm_aplicada = trm;

    const { error: updateError } = await supabase.from("ingresos").update(updatePayload).eq("id", ingreso.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    const { error: movError } = await supabase.from("movimientos_cuenta").insert({
      cuenta_id: cuentaId,
      fecha,
      tipo: "Ingreso",
      monto: ingreso.monto_original,
      tasa_cambio: trm,
      descripcion: "Pago de cliente (factura cobrada)",
      ingreso_id: ingreso.id,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (movError) {
      setError(`Quedó cobrado, pero no se pudo registrar en la cuenta: ${movError.message}`);
      onDone();
      return;
    }

    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-accent-bright text-sm font-medium mr-3">
        Marcar cobrado
      </button>
    );
  }

  return (
    <span className="relative inline-block mr-3">
      <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-border bg-surface p-3 flex flex-col gap-2 shadow-lg">
        <p className="text-xs font-medium">¿Cuándo y dónde entró la plata?</p>
        <label className="flex flex-col gap-1 text-xs">
          Fecha real de pago
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Cuenta ({ingreso.moneda})
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
        {ingreso.moneda !== "COP" && (
          <p className="text-xs text-muted">Se trae automáticamente la TRM oficial de esa fecha.</p>
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
      <button className="text-accent-bright text-sm font-medium">Marcar cobrado</button>
    </span>
  );
}
