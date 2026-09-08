export const SMMLV_2026 = 1750905;
export const MAX_IBC_SMMLV = 25;
export const MIN_IBC_SMMLV = 1;

export type PayrollCalculationParams = {
  salarioBase: number; // Salario mensual
  diasTrabajados?: number; // Por defecto 30
  auxilioTransporte?: number; // Por defecto 0
  riesgoArl?: number; // Ej: 0.00522 para riesgo I
  exoneradoLey1607?: boolean; // Si aplica exoneración de salud, SENA e ICBF
};

export type PayrollResult = {
  devengado: {
    salarioProporcional: number;
    auxilioTransporteProporcional: number;
    total: number;
  };
  deduccionesEmpleado: {
    salud: number;
    pension: number;
    fondoSolidaridad: number;
    total: number;
  };
  aportesEmpleador: {
    salud: number;
    pension: number;
    arl: number;
    cajaCompensacion: number;
    sena: number;
    icbf: number;
    total: number;
  };
  netoAPagarEmpleado: number;
  costoTotalEmpresa: number; // Devengado total + Aportes empleador
};

export function calculatePayroll({
  salarioBase,
  diasTrabajados = 30,
  auxilioTransporte = 0,
  riesgoArl = 0.00522,
  exoneradoLey1607 = false,
}: PayrollCalculationParams): PayrollResult {
  
  // 1. DEVENGOS PROPORCIONALES AL TIEMPO TRABAJADO
  const proporcionDias = diasTrabajados / 30;
  const salarioProporcional = salarioBase * proporcionDias;
  const auxilioTransporteProporcional = auxilioTransporte * proporcionDias;
  const devengadoTotal = salarioProporcional + auxilioTransporteProporcional;

  // 2. CÁLCULO DEL IBC (Ingreso Base de Cotización)
  // El auxilio de transporte NO hace parte del IBC.
  // El IBC mínimo es 1 SMMLV (si trabajó 30 días, proporcional si trabajó menos), máximo 25 SMMLV
  const smmlvProporcional = SMMLV_2026 * proporcionDias;
  let ibc = salarioProporcional;

  if (ibc < smmlvProporcional) {
    ibc = smmlvProporcional;
  }
  
  const topeIbc = SMMLV_2026 * MAX_IBC_SMMLV * proporcionDias;
  if (ibc > topeIbc) {
    ibc = topeIbc;
  }

  // 3. DEDUCCIONES EMPLEADO
  const deduccionSaludEmpleado = ibc * 0.04;
  const deduccionPensionEmpleado = ibc * 0.04;
  
  // Fondo de Solidaridad Pensional (Aplica si el salario > 4 SMMLV)
  // Supuesto: Se calcula el límite usando el salario mensual completo vs 4 SMMLV. 
  let fondoSolidaridad = 0;
  if (salarioBase >= SMMLV_2026 * 4) {
    // 1% adicional al FSP
    fondoSolidaridad = ibc * 0.01;
    // Nota: Hay aportes adicionales para salarios aún más altos (16+ SMMLV) que varían entre el 0.2% y el 1%, 
    // pero para esta primera iteración nos limitamos al 1% básico del FSP según instrucciones.
  }

  const totalDeduccionesEmpleado = deduccionSaludEmpleado + deduccionPensionEmpleado + fondoSolidaridad;
  
  // 4. APORTES EMPLEADOR
  const aporteSaludEmpleador = exoneradoLey1607 ? 0 : ibc * 0.085;
  const aportePensionEmpleador = ibc * 0.12;
  const aporteArl = ibc * riesgoArl;

  // Parafiscales
  // Caja de Compensación 4% + ICBF 3% + SENA 2% = 9% de parafiscales.
  const cajaCompensacion = ibc * 0.04;
  const sena = exoneradoLey1607 ? 0 : ibc * 0.02;
  const icbf = exoneradoLey1607 ? 0 : ibc * 0.03;

  const totalAportesEmpleador = aporteSaludEmpleador + aportePensionEmpleador + aporteArl + cajaCompensacion + sena + icbf;

  // 5. TOTALES
  const netoAPagarEmpleado = devengadoTotal - totalDeduccionesEmpleado;
  const costoTotalEmpresa = devengadoTotal + totalAportesEmpleador;

  return {
    devengado: {
      salarioProporcional,
      auxilioTransporteProporcional,
      total: devengadoTotal,
    },
    deduccionesEmpleado: {
      salud: deduccionSaludEmpleado,
      pension: deduccionPensionEmpleado,
      fondoSolidaridad,
      total: totalDeduccionesEmpleado,
    },
    aportesEmpleador: {
      salud: aporteSaludEmpleador,
      pension: aportePensionEmpleador,
      arl: aporteArl,
      cajaCompensacion,
      sena,
      icbf,
      total: totalAportesEmpleador,
    },
    netoAPagarEmpleado,
    costoTotalEmpresa,
  };
}
