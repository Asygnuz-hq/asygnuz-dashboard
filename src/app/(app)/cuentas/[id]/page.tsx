"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatUSD } from "@/lib/format";
import { TIPOS_MOVIMIENTO } from "@/lib/catalogs";

type Cuenta = { id: string; nombre: string; moneda: string; tipo: string; activa: boolean };
type Saldo = { saldo_actual: number };

const movimientoColumns: ColumnDef[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_MOVIMIENTO, required: true, defaultValue: "Ingreso" },
  { key: "monto", label: "Monto", type: "number", required: true },
  { key: "tasa_cambio", label: "Tasa de Cambio (si aplica)", type: "number" },
  { key: "descripcion", label: "Descripción", type: "text" },
];

export default function CuentaDetailPage() {
  const params = useParams<{ id: string }>();
  const cuentaId = params.id;
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("cuentas").select("*").eq("id", cuentaId).single(),
        supabase.from("v_saldo_cuentas").select("saldo_actual").eq("cuenta_id", cuentaId).maybeSingle(),
      ]);
      setCuenta(c as Cuenta);
      setSaldo(s as Saldo | null);
      setLoading(false);
    }
    load();
  }, [cuentaId]);

  if (loading) return <p className="text-muted">Cargando...</p>;
  if (!cuenta) return <p className="text-danger">Cuenta no encontrada.</p>;

  const formatMoneda = cuenta.moneda === "USD" ? formatUSD : formatCOP;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={cuenta.nombre} subtitle={`${cuenta.tipo} · ${cuenta.moneda} · ${cuenta.activa ? "Activa" : "Inactiva"}`} />

      <div className="grid grid-cols-2 max-w-md gap-4">
        <KpiCard label="Saldo actual" value={formatMoneda(saldo?.saldo_actual ?? 0)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Movimientos</h2>
        <p className="text-xs text-muted mb-3">
          En Compra/Venta USD registra la tasa de cambio para llevar el histórico de a cómo compraste o vendiste.
        </p>
        <DataTable
          table="movimientos_cuenta"
          columns={movimientoColumns}
          filters={[{ column: "cuenta_id", value: cuentaId }]}
          fixedValues={{ cuenta_id: cuentaId }}
          orderBy="fecha"
          ascending={false}
        />
      </div>
    </div>
  );
}
