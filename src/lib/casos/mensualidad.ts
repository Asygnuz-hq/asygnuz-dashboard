// Caso de negocio de un servicio por mensualidad (Growth: pauta, contenido, community, mentoría) — 2026-11-13.
// Misma lógica que modelo.ts (Monte Carlo, piso/recomendado/premium, meta de ROI) pero el riesgo principal
// no es la duración sino que el cliente se vaya, que pida más de lo acordado y que suban las herramientas en USD.
// Sin dependencias: corre igual en el navegador y en Node.

import type { Rango } from "./modelo";
import type { Valor } from "./valor";

export type SupuestosMensualidad = {
  tipo: "mensualidad";
  equipo: { nombre: string; pagoMensual: number; horasMes: number }[]; // horas al mes dedicadas a ESTE cliente
  horasMesCompleto: number; // horas de un mes de tiempo completo (para pasar sueldo a costo por hora)
  herramientas: { nombre: string; usdMes: number; cantidad: number }[];
  otrosMes: number; // COP/mes: freelancers, banco de imágenes, etc. (la pauta la paga el cliente)
  montaje: { cobro: number; costo: number }; // fee de entrada y lo que cuesta montar (mes 1)
  mesesMinimo: number;
  horizonte: number; // meses que se evalúan
  churnMinimo: number; // prob. mensual de que se vaya durante el mínimo (incumple)
  churn: Rango; // prob. mensual de que se vaya después del mínimo
  alcanceExtra: Rango; // % de horas por encima de lo acordado (reuniones, piezas de más)
  trm: Rango;
  cobroAnticipado: boolean; // mes anticipado (true) o mes vencido
  tasaDescuentoEA: number;
  metaRoi: number;
  administracion: number;
  pctSobrePrecio: number;
  valor?: Valor;
};

export const PLANTILLA_MENSUALIDAD: SupuestosMensualidad = {
  tipo: "mensualidad",
  equipo: [
    { nombre: "Estratega / Trafficker", pagoMensual: 3_500_000, horasMes: 30 },
    { nombre: "Diseñadora", pagoMensual: 2_500_000, horasMes: 40 },
    { nombre: "Community manager", pagoMensual: 2_000_000, horasMes: 30 },
  ],
  horasMesCompleto: 176,
  herramientas: [{ nombre: "Canva / IA / programador", usdMes: 40, cantidad: 1 }],
  otrosMes: 0,
  montaje: { cobro: 0, costo: 1_500_000 },
  mesesMinimo: 3,
  horizonte: 12,
  churnMinimo: 0.03,
  churn: { min: 0.04, moda: 0.08, max: 0.15 },
  alcanceExtra: { min: 0, moda: 0.1, max: 0.35 },
  trm: { min: 3300, moda: 3600, max: 4200 },
  cobroAnticipado: true,
  tasaDescuentoEA: 0.165,
  metaRoi: 0.4,
  administracion: 0.1,
  pctSobrePrecio: 0,
};

// Piso: gana plata en 8 de 10 clientes. Recomendado: gana en 9 de 10 y llega a la meta en 7 de 10.
// Premium: llega a la meta en 9 de 10.
export const REGLA_MENSUALIDAD = { pisoVpnPos: 0.8, recVpnPos: 0.9, recRoiMeta: 0.7, premiumRoiMeta: 0.9 };

const tasaMensual = (ea: number) => (1 + ea) ** (1 / 12) - 1;

/** Costo de un mes de operación (sin montaje), y el total con administración. */
export function costoMes(s: SupuestosMensualidad, extra: number, trm: number) {
  const equipo = s.equipo.reduce((a, r) => a + (r.pagoMensual / (s.horasMesCompleto || 176)) * r.horasMes, 0) * (1 + extra);
  const herramientas = s.herramientas.reduce((a, h) => a + h.usdMes * h.cantidad, 0) * trm;
  return { equipo, herramientas, otros: s.otrosMes, total: (equipo + herramientas + s.otrosMes) * (1 + s.administracion) };
}

// ---------- muestreo (mismas funciones que modelo.ts) ----------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function muestreador(semilla: number) {
  const u = mulberry32(semilla);
  const normal = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const gamma = (k: number): number => {
    if (k < 1) return gamma(k + 1) * u() ** (1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v ** 3;
      const w = u();
      if (w < 1 - 0.0331 * x ** 4 || Math.log(w) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const pert = ({ min: a, moda: m, max: b }: Rango) => {
    if (b <= a) return a;
    const x = gamma(1 + (4 * (m - a)) / (b - a)), y = gamma(1 + (4 * (b - m)) / (b - a));
    return a + (b - a) * (x / (x + y));
  };
  return { u, pert };
}

export function cuantil(x: ArrayLike<number>, q: number): number {
  const a = Array.from(x).sort((p, r) => p - r);
  const h = (a.length - 1) * q, i = Math.floor(h);
  return i + 1 < a.length ? a[i] + (h - i) * (a[i + 1] - a[i]) : a[i];
}

/**
 * Una corrida = cuántos meses se queda el cliente y cuánto cuesta atenderlo. El ingreso es lineal en el fee F:
 *   VPN = F·A + S·dS − PVcosto      (A = Σ descuento de los meses cobrados × (1 − % sobre precio))
 * así que el fee de equilibrio de cada corrida sale directo, sin buscarlo.
 */
type CorridaM = { meses: Float64Array; costo: Float64Array; pvCosto: Float64Array; A: Float64Array; costoMes: Float64Array };
export type SimulacionM = { s: SupuestosMensualidad; n: number; k: CorridaM; dS: number };

export function simularMensualidad(s: SupuestosMensualidad, n = 10_000, semilla = 20261113): SimulacionM {
  const { u, pert } = muestreador(semilla);
  const d = 1 / (1 + tasaMensual(s.tasaDescuentoEA));
  const vp = s.pctSobrePrecio;
  const k: CorridaM = { meses: new Float64Array(n), costo: new Float64Array(n), pvCosto: new Float64Array(n), A: new Float64Array(n), costoMes: new Float64Array(n) };
  const H = Math.max(1, Math.round(s.horizonte));
  const montaje = s.montaje.costo * (1 + s.administracion);
  for (let i = 0; i < n; i++) {
    const churn = pert(s.churn), extra = pert(s.alcanceExtra), trm = pert(s.trm);
    const cm = costoMes(s, extra, trm).total;
    // El cliente decide al final de cada mes si sigue.
    let mes = 1;
    while (mes < H && u() >= (mes < s.mesesMinimo ? s.churnMinimo : churn)) mes++;
    let costo = montaje, pv = montaje, A = 0;
    for (let m = 1; m <= mes; m++) {
      costo += cm;
      pv += cm * d ** m; // el costo del mes se paga al cierre del mes
      A += d ** (s.cobroAnticipado ? m - 1 : m) * (1 - vp);
    }
    k.meses[i] = mes; k.costo[i] = costo; k.pvCosto[i] = pv; k.A[i] = A; k.costoMes[i] = cm;
  }
  return { s, n, k, dS: 1 - vp };
}

/** Fee de VPN 0 y fee de meta de ROI de cada corrida. */
function equilibrios(sim: SimulacionM) {
  const { s, k, n, dS } = sim;
  const m = s.metaRoi, vp = s.pctSobrePrecio, den = 1 - vp * (1 + m), S = s.montaje.cobro;
  const vpn0 = new Float64Array(n), roi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    vpn0[i] = Math.max(0, (k.pvCosto[i] - S * dS) / k.A[i]);
    // ingreso·(1 − vp(1+m)) ≥ costo·(1+m), con ingreso = F·meses + S
    roi[i] = den > 0 ? Math.max(0, ((k.costo[i] * (1 + m)) / den - S) / k.meses[i]) : Infinity;
  }
  return { vpn0, roi };
}

const redondear = (x: number) => Math.ceil(x / 100_000) * 100_000;

export function feesSugeridos(sim: SimulacionM) {
  const { vpn0, roi } = equilibrios(sim);
  const R = REGLA_MENSUALIDAD;
  return {
    piso: redondear(cuantil(vpn0, R.pisoVpnPos)),
    recomendado: redondear(Math.max(cuantil(vpn0, R.recVpnPos), cuantil(roi, R.recRoiMeta))),
    premium: redondear(cuantil(roi, R.premiumRoiMeta)),
  };
}

export type ResumenM = {
  pVpnPos: number; pRoiMeta: number; vpnMedia: number; vpnP5: number;
  mesesMedia: number; mesesP50: number; pMinimo: number; ingresoMedia: number;
  margenMes: number; costoMesMedia: number; recuperaMontaje: number | null; pRecupera: number;
};

export function resumenMensualidad(sim: SimulacionM, fee: number): ResumenM {
  const { s, k, n, dS } = sim;
  const vp = s.pctSobrePrecio, S = s.montaje.cobro;
  let pos = 0, meta = 0, sumV = 0, sumM = 0, sumIng = 0, sumCm = 0, enMin = 0;
  const vpn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = fee * k.A[i] + S * dS - k.pvCosto[i];
    vpn[i] = v;
    const ingreso = fee * k.meses[i] + S, egreso = k.costo[i] + ingreso * vp;
    if (v > 0) pos++;
    if ((ingreso - egreso) / egreso >= s.metaRoi) meta++;
    sumV += v; sumM += k.meses[i]; sumIng += ingreso; sumCm += k.costoMes[i];
    if (k.meses[i] >= s.mesesMinimo) enMin++;
  }
  const costoMesMedia = sumCm / n;
  const ganMes = fee * (1 - vp) - costoMesMedia;
  const hueco = s.montaje.costo * (1 + s.administracion) - S * (1 - vp);
  const recupera = hueco <= 0 ? 0 : ganMes > 0 ? Math.ceil(hueco / ganMes) : null;
  let rec = 0;
  if (recupera !== null) for (let i = 0; i < n; i++) if (k.meses[i] >= recupera) rec++;
  return {
    pVpnPos: pos / n, pRoiMeta: meta / n, vpnMedia: sumV / n, vpnP5: cuantil(vpn, 0.05),
    mesesMedia: sumM / n, mesesP50: cuantil(k.meses, 0.5), pMinimo: enMin / n, ingresoMedia: sumIng / n,
    margenMes: fee > 0 ? ganMes / fee : 0, costoMesMedia, recuperaMontaje: recupera, pRecupera: recupera === null ? 0 : rec / n,
  };
}

export function curvaFees(sim: SimulacionM, desde: number, hasta: number, pasos = 40) {
  const { vpn0, roi } = equilibrios(sim);
  return Array.from({ length: pasos + 1 }, (_, j) => {
    const precio = Math.round(desde + ((hasta - desde) * j) / pasos);
    let a = 0, b = 0;
    for (let i = 0; i < sim.n; i++) { if (vpn0[i] < precio) a++; if (roi[i] <= precio) b++; }
    return { precio, pVpnPos: a / sim.n, pRoiMeta: b / sim.n };
  });
}

/** Costo de un mes típico por concepto (sin montaje). */
export function desgloseMes(s: SupuestosMensualidad) {
  const c = costoMes(s, s.alcanceExtra.moda, s.trm.moda);
  const base = costoMes(s, 0, s.trm.moda).equipo;
  return [
    ...s.equipo.map((r) => ({ concepto: r.nombre, valor: (r.pagoMensual / (s.horasMesCompleto || 176)) * r.horasMes })),
    { concepto: "Horas de más (alcance)", valor: c.equipo - base },
    { concepto: "Herramientas", valor: c.herramientas },
    { concepto: "Otros", valor: c.otros },
    { concepto: "Administración", valor: (c.equipo + c.herramientas + c.otros) * s.administracion },
  ].filter((p) => p.valor > 0);
}

/** Margen de un mes típico (valores más probables) a un fee dado; para la lista de negocios. */
export function margenMesTipico(s: SupuestosMensualidad, fee: number) {
  if (fee <= 0) return null;
  return (fee * (1 - s.pctSobrePrecio) - costoMes(s, s.alcanceExtra.moda, s.trm.moda).total) / fee;
}
