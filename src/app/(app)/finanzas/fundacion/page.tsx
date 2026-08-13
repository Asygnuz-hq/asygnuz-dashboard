"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { VincularCuenta, type ItemVinculable } from "@/components/VincularCuenta";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "causa_proyecto", label: "Causa / Proyecto", type: "text", required: true },
  { key: "beneficiario", label: "Beneficiario", type: "text" },
  { key: "descripcion", label: "Descripción", type: "text" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto", label: "Monto", type: "number" },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "estado", label: "Estado", type: "select", options: ["Comprometido", "Pagado"], defaultValue: "Comprometido" },
  { key: "fecha_pago", label: "Fecha Pago", type: "date" },
];

export default function FundacionPage() {
  return (
    <div>
      <PageHeader
        title="Fundación — donaciones"
        subtitle="Comprometido = intención confirmada · Pagado = desembolsado. Usa 'Vincular a cuenta' para que la donación descuente tu caja real."
      />
      <DataTable
        table="fundacion_donaciones"
        columns={columns}
        orderBy="fecha"
        ascending={false}
        rowActions={(row, reload) => (
          <VincularCuenta
            key={row.id}
            item={{
              id: row.id,
              moneda: row.moneda,
              monto: row.monto,
              trm_aplicada: row.trm_aplicada,
              fecha: row.fecha_pago ?? row.fecha,
              concepto: row.causa_proyecto,
              cuenta_id: row.cuenta_id,
            } as ItemVinculable}
            table="fundacion_donaciones"
            fkColumn="donacion_id"
            pregunta="¿Con qué cuenta hiciste esta donación?"
            onDone={reload}
          />
        )}
      />
    </div>
  );
}
