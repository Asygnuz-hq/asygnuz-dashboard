"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Cuenta = { id: string; nombre: string; moneda: string };

export function CambioDivisa({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [monedaExtranjera, setMonedaExtranjera] = useState<"USD" | "EUR">("USD");
  const [operacion, setOperacion] = useState<"Comprar" | "Vender">("Comprar");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [montoDivisa, setMontoDivisa] = useState("");
  const [tasa, setTasa] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("cuentas").select("id, nombre, moneda").eq("activa", true);
      setCuentas((data as Cuenta[]) ?? []);
    }
    load();
  }, [open]);

  const monedaOrigen = operacion === "Comprar" ? "COP" : monedaExtranjera;
  const monedaDestino = operacion === "Comprar" ? monedaExtranjera : "COP";
  const cuentasOrigen = cuentas.filter((c) => c.moneda === monedaOrigen);
  const cuentasDestino = cuentas.filter((c) => c.moneda === monedaDestino);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const divisa = Number(montoDivisa);
    const tasaNum = Number(tasa);
    if (!origenId || !destinoId || !divisa || !tasaNum) {
      setError(`Completa cuenta origen, destino, monto ${monedaExtranjera} y tasa.`);
      return;
    }
    const montoCop = Math.round(divisa * tasaNum);
    const nota = descripcion || `Cambio de divisa ${fecha}`;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const legs =
      operacion === "Comprar"
        ? [
            { cuenta_id: origenId, tipo: "Gasto", monto: montoCop, tasa_cambio: tasaNum },
            { cuenta_id: destinoId, tipo: `Compra ${monedaExtranjera}`, monto: divisa, tasa_cambio: tasaNum },
          ]
        : [
            { cuenta_id: origenId, tipo: `Venta ${monedaExtranjera}`, monto: divisa, tasa_cambio: tasaNum },
            { cuenta_id: destinoId, tipo: "Ingreso", monto: montoCop, tasa_cambio: tasaNum },
          ];

    const { error: insertError } = await supabase.from("movimientos_cuenta").insert(
      legs.map((leg) => ({
        ...leg,
        fecha,
        descripcion: nota,
        created_by: user?.id ?? null,
      }))
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMontoDivisa("");
    setTasa("");
    setDescripcion("");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent text-accent-foreground text-sm font-medium px-3 py-1.5"
      >
        Cambio de Divisa (Comprar/Vender USD o EUR)
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 max-w-md"
    >
      <p className="text-sm font-medium">Cambio de Divisa</p>
      <p className="text-xs text-muted">
        Mueve la plata automáticamente entre dos cuentas: una sale, la otra recibe, a la tasa que definas.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Moneda extranjera
        <select value={monedaExtranjera} onChange={(e) => setMonedaExtranjera(e.target.value as "USD" | "EUR")}>
          <option value="USD">Dólares (USD)</option>
          <option value="EUR">Euros (EUR)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Operación
        <select value={operacion} onChange={(e) => setOperacion(e.target.value as "Comprar" | "Vender")}>
          <option value="Comprar">Comprar {monedaExtranjera} (sale COP, entra {monedaExtranjera})</option>
          <option value="Vender">Vender {monedaExtranjera} (sale {monedaExtranjera}, entra COP)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cuenta origen ({monedaOrigen})
        <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
          <option value="" disabled>
            Selecciona
          </option>
          {cuentasOrigen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cuenta destino ({monedaDestino})
        <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} required>
          <option value="" disabled>
            Selecciona
          </option>
          {cuentasDestino.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Monto en {monedaExtranjera}
        <input type="number" step="any" value={montoDivisa} onChange={(e) => setMontoDivisa(e.target.value)} required />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Tasa de cambio (COP por {monedaExtranjera})
        <input type="number" step="any" value={tasa} onChange={(e) => setTasa(e.target.value)} required />
      </label>

      {montoDivisa && tasa && (
        <p className="text-xs text-muted">Equivale a {formatPreview(Number(montoDivisa) * Number(tasa))} COP</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Fecha
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nota (opcional)
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent text-accent-foreground font-medium px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Confirmar cambio"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function formatPreview(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}
