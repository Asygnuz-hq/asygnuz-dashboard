"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculatePayroll, SMMLV_2026, PayrollResult } from "@/lib/payroll";

// Tipos extraídos de la base de datos
type Contrato = {
  id: string;
  empleado_id: string;
  salario_base: number;
  auxilio_transporte: number;
  porcentaje_arl: number;
  // TODO: Agregar switch real en la tabla si la empresa tiene la exoneración activa por defecto
};

type EmpleadoConContrato = {
  id: string;
  nombres: string;
  apellidos: string;
  contratos: Contrato[];
};

export type RawEmployeePayroll = {
  id: string;
  empleado_nombre: string;
  salarioBase: number;
  diasTrabajados: number;
  auxilioTransporte: number;
  riesgoArl: number;
  exoneradoLey1607: boolean;
};

export default function PayrollTable({ month, year }: { month: number; year: number }) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<RawEmployeePayroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });

  useEffect(() => {
    fetchActiveContracts();
  }, [month, year]);

  const fetchActiveContracts = async () => {
    setIsLoading(true);
    // Traemos los empleados con sus contratos
    // Para simplificar, buscamos todos los empleados activos y su contrato activo
    const { data, error } = await supabase
      .from('empleados')
      .select(`
        id, 
        nombres, 
        apellidos,
        contratos(
          id,
          salario_base,
          auxilio_transporte,
          porcentaje_arl
        )
      `)
      .eq('estado', 'activo')
      .is('eliminado_en', null);

    if (error) {
      console.error("Error fetching payroll data:", error);
      setIsLoading(false);
      return;
    }

    // Mapeamos los datos de Supabase al formato que espera nuestra calculadora
    const rawData: RawEmployeePayroll[] = (data as any[]).map((emp) => {
      // Tomamos el primer contrato (asumiendo que es el activo)
      const contratoActivo = emp.contratos && emp.contratos.length > 0 ? emp.contratos[0] : null;

      return {
        id: emp.id,
        empleado_nombre: `${emp.nombres} ${emp.apellidos}`,
        salarioBase: contratoActivo ? contratoActivo.salario_base : 0,
        auxilioTransporte: contratoActivo ? contratoActivo.auxilio_transporte : 0,
        riesgoArl: contratoActivo ? contratoActivo.porcentaje_arl : 0.00522, // Riesgo 1 por defecto
        diasTrabajados: 30, // TODO: Cruzar con tabla de ausencias en el futuro
        exoneradoLey1607: true, // TODO: Parámetro que debería venir del config de la empresa (cuenta)
      };
    }).filter(emp => emp.salarioBase > 0); // Solo mostramos los que tienen contrato configurado

    setEmployees(rawData);
    setIsLoading(false);
  };

  // Procesamos la nómina usando la función exacta PILA
  const calculatedDetails = employees.map(emp => {
    const calc = calculatePayroll({
      salarioBase: emp.salarioBase,
      diasTrabajados: emp.diasTrabajados,
      auxilioTransporte: emp.auxilioTransporte,
      riesgoArl: emp.riesgoArl,
      exoneradoLey1607: emp.exoneradoLey1607,
    });
    
    return {
      ...emp,
      ...calc,
    };
  });

  const handleApprovePayroll = async () => {
    if (calculatedDetails.length === 0) return;
    setIsSaving(true);
    
    // 1. Crear el registro maestro de la nómina
    const { data: nomina, error: nominaError } = await supabase
      .from('nominas')
      .insert([{
        periodo_mes: month,
        periodo_anio: year,
        estado: 'aprobada',
        total_devengado: calculatedDetails.reduce((acc, row) => acc + row.devengado.total, 0),
        total_deducido: calculatedDetails.reduce((acc, row) => acc + row.deduccionesEmpleado.total, 0),
        total_aportes_empresa: calculatedDetails.reduce((acc, row) => acc + row.aportesEmpleador.total, 0)
      }])
      .select('id')
      .single();

    if (nominaError || !nomina) {
      console.error("Error creating nomina:", nominaError);
      alert("Error al aprobar nómina: " + nominaError?.message);
      setIsSaving(false);
      return;
    }

    // 2. Insertar los detalles de la nómina por cada empleado
    const detallesToInsert = calculatedDetails.map(row => ({
      nomina_id: nomina.id,
      empleado_id: row.id,
      dias_trabajados: row.diasTrabajados,
      salario_proporcional: row.devengado.salarioProporcional,
      auxilio_transporte_proporcional: row.devengado.auxilioTransporteProporcional,
      deduccion_salud: row.deduccionesEmpleado.salud,
      deduccion_pension: row.deduccionesEmpleado.pension + row.deduccionesEmpleado.fondoSolidaridad,
      aporte_salud_empresa: row.aportesEmpleador.salud,
      aporte_pension_empresa: row.aportesEmpleador.pension,
      aporte_arl: row.aportesEmpleador.arl,
      aporte_caja_compensacion: row.aportesEmpleador.cajaCompensacion,
      neto_a_pagar: row.netoAPagarEmpleado
    }));

    const { error: detalleError } = await supabase
      .from('nominas_detalle')
      .insert(detallesToInsert);

    if (detalleError) {
      console.error("Error inserting nomina detalles:", detalleError);
      alert("Error guardando el detalle: " + detalleError.message);
    } else {
      alert("Nómina aprobada y guardada exitosamente en la base de datos.");
    }
    
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-4 text-center text-muted">Calculando nómina desde base de datos...</div>;

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between border-b border-border gap-4">
        <div>
          <h2 className="text-lg font-semibold">Nómina (Cálculo Detallado PILA)</h2>
          <p className="text-sm text-muted">
            Período: {month}/{year} | SMMLV Base: {formatter.format(SMMLV_2026)}
          </p>
        </div>
        <div className="space-x-3 flex">
          <button
            onClick={fetchActiveContracts}
            className="border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-alt"
          >
            Recalcular Nómina
          </button>
          <button
            onClick={handleApprovePayroll}
            disabled={isSaving || calculatedDetails.length === 0}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-bright disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Aprobar y Guardar BD"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-alt text-muted whitespace-nowrap">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-center">Días</th>
              <th className="px-4 py-3 font-medium text-right">Devengado (Salario + Aux)</th>
              <th className="px-4 py-3 font-medium text-right" title="Salud + Pensión + FSP (si aplica)">Deducciones (Trabajador)</th>
              <th className="px-4 py-3 font-medium text-right" title="Salud + Pensión + ARL + Parafiscales">Aportes (Empleador)</th>
              <th className="px-4 py-3 font-medium text-right bg-surface">Neto a Pagar</th>
              <th className="px-4 py-3 font-medium text-right">Costo Total Empresa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {calculatedDetails.map((row) => (
              <tr key={row.id} className="hover:bg-surface-alt transition-colors">
                <td className="px-4 py-3 font-medium">
                  {row.empleado_nombre}
                  {row.exoneradoLey1607 && <span className="ml-2 inline-block text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded">Exonerado 1607</span>}
                </td>
                <td className="px-4 py-3 text-center">{row.diasTrabajados}</td>
                <td className="px-4 py-3 text-right text-success">
                  {formatter.format(row.devengado.total)}
                </td>
                <td className="px-4 py-3 text-right text-danger">
                  {formatter.format(row.deduccionesEmpleado.total)}
                  {row.deduccionesEmpleado.fondoSolidaridad > 0 && <span className="block text-[10px] text-muted">Incluye 1% FSP</span>}
                </td>
                <td className="px-4 py-3 text-right text-accent-bright">
                  {formatter.format(row.aportesEmpleador.total)}
                </td>
                <td className="px-4 py-3 text-right font-bold bg-surface-alt">
                  {formatter.format(row.netoAPagarEmpleado)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatter.format(row.costoTotalEmpresa)}
                </td>
              </tr>
            ))}

            {calculatedDetails.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No hay contratos de empleados registrados o activos para generar nómina.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-surface-alt text-xs text-muted border-t border-border">
        <p><strong>Nota contable:</strong> La exoneración de la Ley 1607 exime al empleador del pago de Salud (8.5%), SENA (2%) e ICBF (3%). El aporte de Caja de Compensación (4%) y Pensión (12%) sigue aplicando. El IBC respeta los límites de 1 a 25 SMMLV proporcional a los días laborados.</p>
      </div>
    </div>
  );
}
