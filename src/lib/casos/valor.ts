// Valor para el cliente (2026-11-13) — la lógica del caso EmpoderaDos F3 generalizada: cuánto gana el CLIENTE
// con lo que le vendemos (horas liberadas, ahorros, ventas extra), con rampa y riesgo de que no se logre, contra
// lo que nos paga. Da el techo de precio (hasta dónde el cliente sigue ganando) y el argumento para la propuesta.
// Sirve igual para proyecto a precio fijo y para mensualidad: lo que paga el cliente es lineal en nuestro precio.

import type { Rango } from "./modelo";
import { cuantil, muestreador } from "./mensualidad";

export type Valor = {
  beneficios: { nombre: string; mensual: Rango; prob: number; nota: string }[]; // COP/mes en régimen pleno
  inicioMes: number; // mes (desde la firma, 1 = primer mes) en que empieza a dar beneficio
  rampa: Rango; // meses hasta llegar al beneficio pleno
  horizonte: number; // meses que se evalúan
  costoClienteInicial: number; // lo que pone el cliente aparte de nosotros (licencias, su tiempo)
  costoClienteMes: number;
  tasaDescuentoEA: number;
};

export const PLANTILLA_VALOR: Valor = {
  beneficios: [
    { nombre: "Horas liberadas del equipo", mensual: { min: 2_000_000, moda: 4_000_000, max: 6_000_000 }, prob: 0.9, nota: "Ej.: 160 h/mes × 25.000 $/h costo empresa" },
    { nombre: "Ventas adicionales (margen)", mensual: { min: 1_000_000, moda: 3_000_000, max: 8_000_000 }, prob: 0.6, nota: "Margen bruto de las ventas nuevas, no la venta" },
  ],
  inicioMes: 3,
  rampa: { min: 2, moda: 3, max: 6 },
  horizonte: 24,
  costoClienteInicial: 0,
  costoClienteMes: 0,
  tasaDescuentoEA: 0.165,
};

/**
 * Lo que paga el cliente, a valor presente: precio × factorPV + fijoPV.
 * Proyecto: anticipo al firmar y el resto al entregar. Mensualidad: el fee cada mes del horizonte + montaje.
 */
export type Inversion = { factorPV: number; fijoPV: number; pagos: (precio: number) => number[] };

const dMes = (ea: number) => 1 / (1 + ((1 + ea) ** (1 / 12) - 1));

export function inversionProyecto(v: Valor, anticipo: number, mesPago: number): Inversion {
  const d = dMes(v.tasaDescuentoEA);
  return {
    factorPV: anticipo + (1 - anticipo) * d ** mesPago,
    fijoPV: 0,
    pagos: (p) => Array.from({ length: v.horizonte + 1 }, (_, m) => (m === 0 ? p * anticipo : 0) + (m === mesPago ? p * (1 - anticipo) : 0)),
  };
}

export function inversionMensualidad(v: Valor, montaje: number): Inversion {
  const d = dMes(v.tasaDescuentoEA);
  let f = 0;
  for (let m = 0; m < v.horizonte; m++) f += d ** m;
  return {
    factorPV: f,
    fijoPV: montaje,
    pagos: (p) => Array.from({ length: v.horizonte + 1 }, (_, m) => (m < v.horizonte ? p : 0) + (m === 0 ? montaje : 0)),
  };
}

const factorRampa = (m: number, inicio: number, rampa: number) => (m < inicio ? 0 : Math.min(1, (m - inicio + 1) / Math.max(1, rampa)));

export type SimulacionValor = { v: Valor; n: number; pvNeto: Float64Array; beneficioTotal: Float64Array; inv: Inversion };

export function simularValor(v: Valor, inv: Inversion, n = 10_000, semilla = 20261104): SimulacionValor {
  const { u, pert } = muestreador(semilla);
  const d = dMes(v.tasaDescuentoEA);
  const pvNeto = new Float64Array(n), beneficioTotal = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const rampa = Math.max(1, Math.round(pert(v.rampa)));
    const mensual = v.beneficios.reduce((a, b) => a + (u() < b.prob ? pert(b.mensual) : 0), 0);
    let pv = -v.costoClienteInicial, tot = 0;
    for (let m = 1; m <= v.horizonte; m++) {
      const ben = mensual * factorRampa(m, v.inicioMes, rampa);
      tot += ben;
      pv += (ben - v.costoClienteMes) * d ** m;
    }
    pvNeto[i] = pv; // beneficio neto del cliente a valor presente, ANTES de pagarnos
    beneficioTotal[i] = tot;
  }
  return { v, n, pvNeto, beneficioTotal, inv };
}

export type ResumenValor = {
  vpnMedia: number; vpnP5: number; pPierde: number; multiplo: number;
  beneficioTotalMedia: number; beneficioPleno: number;
  techo: number; precio3x: number; recuperaMes: number | null;
};

export function resumenValor(sim: SimulacionValor, precio: number): ResumenValor {
  const { v, n, pvNeto, inv } = sim;
  const pago = precio * inv.factorPV + inv.fijoPV;
  const vpn = Array.from(pvNeto, (x) => x - pago);
  const neto = cuantil(pvNeto, 0.5);
  // Flujo esperado (sin azar, beneficios × su probabilidad) para el mes de recuperación.
  const pleno = v.beneficios.reduce((a, b) => a + b.prob * b.mensual.moda, 0);
  const pagos = inv.pagos(precio);
  let acum = -v.costoClienteInicial, recupera: number | null = null;
  for (let m = 0; m <= v.horizonte; m++) {
    acum += (m ? pleno * factorRampa(m, v.inicioMes, v.rampa.moda) - v.costoClienteMes : 0) - pagos[m];
    if (recupera === null && m > 0 && acum >= 0) recupera = m;
  }
  return {
    vpnMedia: vpn.reduce((a, b) => a + b, 0) / n,
    vpnP5: cuantil(vpn, 0.05),
    pPierde: vpn.filter((x) => x < 0).length / n,
    multiplo: pago > 0 ? neto / pago : 0,
    beneficioTotalMedia: sim.beneficioTotal.reduce((a, b) => a + b, 0) / n,
    beneficioPleno: pleno,
    // Techo: el precio con el que el cliente todavía gana en 8 de cada 10 escenarios.
    techo: Math.max(0, (cuantil(pvNeto, 0.2) - inv.fijoPV) / inv.factorPV),
    // Precio que le devuelve al cliente 3 veces lo que paga (escenario mediano).
    precio3x: Math.max(0, (neto / 3 - inv.fijoPV) / inv.factorPV),
    recuperaMes: recupera,
  };
}

/** Beneficio esperado y pagos acumulados por mes, para la gráfica. */
export function flujoValor(sim: SimulacionValor, precio: number) {
  const { v, inv } = sim;
  const pleno = v.beneficios.reduce((a, b) => a + b.prob * b.mensual.moda, 0);
  const pagos = inv.pagos(precio);
  let ben = 0, pag = v.costoClienteInicial;
  return Array.from({ length: v.horizonte + 1 }, (_, m) => {
    if (m) ben += pleno * factorRampa(m, v.inicioMes, v.rampa.moda);
    pag += pagos[m] + (m ? v.costoClienteMes : 0);
    return { mes: m, beneficio: Math.round(ben), pagado: Math.round(pag) };
  });
}
