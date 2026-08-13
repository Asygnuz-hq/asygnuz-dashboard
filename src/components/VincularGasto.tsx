"use client";

import { VincularCuenta } from "@/components/VincularCuenta";

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
  return (
    <VincularCuenta
      item={gasto}
      table="gastos_variables"
      fkColumn="gasto_id"
      pregunta="¿Con qué cuenta pagaste este gasto?"
      onDone={onDone}
    />
  );
}
