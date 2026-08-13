"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ActionModal } from "@/components/ActionModal";

type Cuenta = { id: string; nombre: string; moneda: string };

export type ItemVinculable = {
  id: string;
  moneda: string;
  monto: number;
  trm_aplicada: number | null;
  fecha: string | null;
  concepto: string;
  cuenta_id: string | null;
};

export function VincularCuenta({
  item,
  table,
  fkColumn,
  pregunta,
  onDone,
}: {
  item: ItemVinculable;
  /** Tabla dueña del registro: "gastos_variables" | "fundacion_donaciones" | "inversiones" */
  table: string;
  /** Columna en movimientos_cuenta que guarda el vínculo: "gasto_id" | "donacion_id" | "inversion_id" */
  fkColumn: string;
  /** Texto de la pregunta en el modal, ej. "¿Con qué cuenta pagaste este gasto?" */
  pregunta: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaNombre, setCuentaNombre] = useState<string | null>(null);
  const [cuentaId, setCuentaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item.cuenta_id) return;
    const supabase = createClient();
    supabase
      .from("cuentas")
      .select("nombre")
      .eq("id", item.cuenta_id)
      .maybeSingle()
      .then(({ data }) => setCuentaNombre((data as { nombre: string } | null)?.nombre ?? null));
  }, [item.cuenta_id]);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("cuentas")
        .select("id, nombre, moneda")
        .eq("activa", true)
        .eq("moneda", item.moneda)
        .is("eliminado_en", null);
      setCuentas((data as Cuenta[]) ?? []);
    }
    load();
  }, [open, item.moneda]);

  if (item.cuenta_id) {
    return <span className="text-xs text-muted mr-3">Pagado de {cuentaNombre ?? "..."}</span>;
  }

  async function handleConfirm() {
    setError(null);
    if (!cuentaId) {
      setError(`Selecciona qué cuenta ${item.moneda} pagó esto.`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase.from(table).update({ cuenta_id: cuentaId }).eq("id", item.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    const { error: movError } = await supabase.from("movimientos_cuenta").insert({
      cuenta_id: cuentaId,
      fecha: item.fecha ?? new Date().toISOString().slice(0, 10),
      tipo: "Gasto",
      monto: item.monto,
      tasa_cambio: item.trm_aplicada || null,
      descripcion: item.concepto,
      [fkColumn]: item.id,
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
    <ActionModal title={pregunta} onClose={() => setOpen(false)}>
      <label className="flex flex-col gap-1 text-sm">
        Cuenta ({item.moneda})
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
      {cuentas.length === 0 && <p className="text-sm text-danger">No tienes cuentas activas en {item.moneda}.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="rounded-md bg-accent text-accent-foreground text-sm font-medium px-3 py-1.5 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-border text-sm px-3 py-1.5 text-muted"
        >
          Cancelar
        </button>
      </div>
    </ActionModal>
  );
}
