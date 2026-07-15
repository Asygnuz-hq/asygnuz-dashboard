"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatUSD } from "@/lib/format";
import { TIPOS_CUENTA } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Cuenta", type: "text", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: ["COP", "USD"], required: true, defaultValue: "COP" },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_CUENTA, defaultValue: "Banco" },
  { key: "saldo_inicial", label: "Saldo Inicial", type: "number" },
  { key: "activa", label: "Activa", type: "boolean", defaultValue: true },
  { key: "notas", label: "Notas", type: "text" },
];

type Saldo = { cuenta_id: string; cuenta: string; moneda: string; tipo: string; activa: boolean; saldo_actual: number };

export default function CuentasPage() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("v_saldo_cuentas").select("*").order("cuenta", { ascending: true });
      setSaldos((data as Saldo[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalCOP = saldos.filter((s) => s.moneda === "COP" && s.activa).reduce((sum, s) => sum + s.saldo_actual, 0);
  const totalUSD = saldos.filter((s) => s.moneda === "USD" && s.activa).reduce((sum, s) => sum + s.saldo_actual, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Cuentas y Caja" subtitle="Tus bancos, billeteras y efectivo. Haz clic en 'Ver' para su bitácora de movimientos." />

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Caja total COP</p>
          <p className="text-2xl font-bold">{formatCOP(totalCOP)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Caja total USD</p>
          <p className="text-2xl font-bold">{formatUSD(totalUSD)}</p>
        </div>
      </div>

      {!loading && saldos.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Moneda</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Saldo Actual</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.cuenta_id} className="border-t border-border">
                  <td className="px-3 py-2">{s.cuenta}</td>
                  <td className="px-3 py-2">{s.tipo}</td>
                  <td className="px-3 py-2">{s.moneda}</td>
                  <td className="px-3 py-2">{s.activa ? "Activa" : "Inactiva"}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {s.moneda === "USD" ? formatUSD(s.saldo_actual) : formatCOP(s.saldo_actual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Administrar cuentas</h2>
        <DataTable table="cuentas" columns={columns} orderBy="nombre" ascending detailBasePath="/cuentas" />
      </div>
    </div>
  );
}
