// Caso de negocio de un proyecto a precio fijo: cuánto cobrar, con qué margen y qué riesgo.
// Replica Pricing_MonteCarlo_Proyecto.xlsx (validado en scripts/test-casos-modelo.mjs) y lo generaliza:
// equipo y herramientas como listas, riesgos con su momento, anticipo, administración y costos sobre el precio
// (comisión, ICA, 4x1000). Sin dependencias ni imports: corre igual en el navegador y en Node.

export const ESCENARIOS = ["pesimista", "probable", "optimista"] as const;
export type Escenario = (typeof ESCENARIOS)[number];
export type Vista = Escenario | "ponderado";
export type Rango = { min: number; moda: number; max: number };
export type Momento = "inicio" | "mitad" | "entrega" | "postEntrega" | "mensual";

export const MOMENTOS: Record<Momento, string> = {
  inicio: "Al inicio",
  mitad: "A mitad del desarrollo",
  entrega: "En la entrega",
  postEntrega: "2 semanas después de entregar",
  mensual: "Cada mes de desarrollo",
};

export type Supuestos = {
  equipo: { nombre: string; pagoMensual: number; dedicacion: number }[];
  herramientas: { nombre: string; usdMes: number; cantidad: number }[];
  riesgos: { nombre: string; impacto: number; momento: Momento; prob: Record<Escenario, number> }[];
  escenarios: Record<Escenario, { duracion: Rango; rezago: Rango; trm: Rango; multRiesgo: Rango }>;
  pesos: Record<Escenario, number>;
  tasaDescuentoEA: number;
  metaRoi: number;
  administracion: number; // % sobre los costos directos (contador, oficina, tiempo de gerencia)
  pctSobrePrecio: number; // % del precio que se va al cobrar: comisión de venta, ICA, 4x1000
  anticipo: number; // % del precio que se cobra en la semana 1; el resto al entregar + rezago
  semanasPorMes: number; // el Excel usa 4 (sobrecosto ~8 %); lo real es 52/12
};

// Plantilla = el Excel "Libro 1" (Senior + Medium + Claude Code, 5 riesgos), con la semana real de 52/12.
export const PLANTILLA: Supuestos = {
  equipo: [
    { nombre: "Dev. Senior Full Stack", pagoMensual: 3_000_000, dedicacion: 1 },
    { nombre: "Dev. Medium Full Stack", pagoMensual: 2_500_000, dedicacion: 1 },
  ],
  herramientas: [{ nombre: "Claude Code", usdMes: 100, cantidad: 3 }],
  riesgos: [
    { nombre: "Retrasos de infraestructura", impacto: 5_500_000, momento: "inicio", prob: { pesimista: 0.6, probable: 0.4, optimista: 0.2 } },
    { nombre: "Reprocesos en pruebas (UAT)", impacto: 6_550_000, momento: "entrega", prob: { pesimista: 1, probable: 1, optimista: 0.7 } },
    { nombre: "API o base de datos del cliente", impacto: 3_000_000, momento: "mitad", prob: { pesimista: 0.9, probable: 0.7, optimista: 0.4 } },
    { nombre: "Soporte de problemas en producción", impacto: 6_550_000, momento: "postEntrega", prob: { pesimista: 1, probable: 1, optimista: 0.6 } },
    { nombre: "Sobrecosto de IA", impacto: 315_000, momento: "mensual", prob: { pesimista: 0.5, probable: 0.3, optimista: 0.15 } },
  ],
  escenarios: {
    pesimista: { duracion: { min: 14, moda: 16, max: 20 }, rezago: { min: 4, moda: 6, max: 10 }, trm: { min: 3500, moda: 3750, max: 4200 }, multRiesgo: { min: 0.9, moda: 1.2, max: 1.8 } },
    probable: { duracion: { min: 7, moda: 8, max: 11 }, rezago: { min: 3, moda: 4, max: 6 }, trm: { min: 3300, moda: 3500, max: 3850 }, multRiesgo: { min: 0.6, moda: 1, max: 1.4 } },
    optimista: { duracion: { min: 3, moda: 4, max: 6 }, rezago: { min: 2, moda: 3, max: 5 }, trm: { min: 3200, moda: 3450, max: 3700 }, multRiesgo: { min: 0.4, moda: 0.7, max: 1 } },
  },
  pesos: { pesimista: 0.25, probable: 0.5, optimista: 0.25 },
  tasaDescuentoEA: 0.165,
  metaRoi: 0.4,
  administracion: 0.1,
  pctSobrePrecio: 0,
  anticipo: 0,
  semanasPorMes: 52 / 12,
};

// Regla de decisión del Excel: el precio más bajo que cumple las tres condiciones.
export const REGLA = { pondVpnPos: 0.95, pondRoiMeta: 0.8, pesVpnPos: 0.8, pisoVpnPos: 0.9, premiumRoiMeta: 0.8 };

// Una realización del proyecto. En el determinista `ocurre` es la probabilidad (valor esperado);
// en Monte Carlo es 0/1 (o el número de meses en que ocurre, si el riesgo es mensual).
type Muestra = { dur: number; rezago: number; trm: number; mult: number; ocurre: number[] };

const tasaSemanal = (s: Supuestos) => (1 + s.tasaDescuentoEA) ** (1 / 52) - 1;
const meses = (dur: number) => Math.ceil(dur / 4);

function semanaRiesgo(m: Momento, dur: number): number {
  if (m === "inicio") return 1;
  if (m === "mitad") return Math.max(1, Math.floor(dur / 2));
  if (m === "postEntrega") return dur + 2;
  return dur; // entrega y mensual (el Excel acumula el sobrecosto mensual en la entrega)
}

// Costos por semana (índice 1 = primera semana) y su desglose, ya con administración.
function costos(s: Supuestos, m: Muestra) {
  const c = new Array<number>(m.dur + Math.max(m.rezago, 2) + 1).fill(0);
  const nominaSem = s.equipo.reduce((a, r) => a + r.pagoMensual * r.dedicacion, 0) / s.semanasPorMes;
  const herrMes = s.herramientas.reduce((a, h) => a + h.usdMes * h.cantidad, 0) * m.trm;
  const adm = 1 + s.administracion;
  let herr = 0;
  for (let w = 1; w <= m.dur; w++) {
    const h = (w - 1) % 4 === 0 ? herrMes : 0; // licencias mensuales: se pagan cada 4 semanas
    c[w] += (nominaSem + h) * adm;
    herr += h;
  }
  const riesgos = s.riesgos.map((r, i) => {
    const v = r.impacto * m.mult * m.ocurre[i];
    c[semanaRiesgo(r.momento, m.dur)] += v * adm;
    return v;
  });
  const directo = nominaSem * m.dur + herr + riesgos.reduce((a, b) => a + b, 0);
  return { c, partes: { nomina: nominaSem * m.dur, herramientas: herr, riesgos, administracion: directo * s.administracion } };
}

function determinista(s: Supuestos, e: Escenario): Muestra {
  const p = s.escenarios[e];
  return {
    dur: p.duracion.moda,
    rezago: p.rezago.moda,
    trm: p.trm.moda,
    mult: 1,
    ocurre: s.riesgos.map((r) => r.prob[e] * (r.momento === "mensual" ? meses(p.duracion.moda) : 1)),
  };
}

function irr(cf: number[]): number | null {
  const vpn = (r: number) => cf.reduce((a, x, w) => a + x / (1 + r) ** w, 0);
  let lo = -0.99, hi = 10;
  if (Math.sign(vpn(lo)) === Math.sign(vpn(hi))) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(vpn(mid)) === Math.sign(vpn(lo))) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type Indicadores = {
  costo: number; vpn: number; roi: number; margen: number; tirMensual: number | null;
  payback: number | null; exposicion: number; semanaPago: number; flujo: number[];
};

// Flujo semanal determinista de un escenario y sus indicadores, a un precio dado.
export function indicadores(s: Supuestos, e: Escenario, precio: number): Indicadores {
  const m = determinista(s, e);
  const { c } = costos(s, m);
  const pago = m.dur + m.rezago;
  const ing = c.map((_, w) => (w === 1 ? precio * s.anticipo : 0) + (w === pago ? precio * (1 - s.anticipo) : 0));
  const flujo = c.map((x, w) => (w === 0 ? 0 : ing[w] * (1 - s.pctSobrePrecio) - x));
  const r = tasaSemanal(s);
  let vpn = 0, acum = 0, exposicion = 0;
  let payback: number | null = null;
  for (let w = 1; w < flujo.length; w++) {
    vpn += flujo[w] / (1 + r) ** w;
    acum += flujo[w];
    exposicion = Math.min(exposicion, acum);
    if (payback === null && acum >= 0) payback = w;
  }
  const egreso = c.reduce((a, b) => a + b, 0) + precio * s.pctSobrePrecio;
  const t = irr(flujo.slice(1));
  return {
    costo: egreso, vpn, roi: (precio - egreso) / egreso, margen: (precio - egreso) / precio,
    tirMensual: t === null ? null : (1 + t) ** (52 / 12) - 1, payback, exposicion, semanaPago: pago, flujo: flujo.slice(1),
  };
}

// ---------- Monte Carlo ----------

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function muestreador(semilla: number) {
  const u = mulberry32(semilla);
  const normal = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const gamma = (k: number): number => {
    if (k < 1) return gamma(k + 1) * u() ** (1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) { // Marsaglia–Tsang
      let x: number, v: number;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v ** 3;
      const w = u();
      if (w < 1 - 0.0331 * x ** 4 || Math.log(w) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const tri = ({ min: a, moda: m, max: b }: Rango) => {
    if (b <= a) return a;
    const x = u(), f = (m - a) / (b - a);
    return x < f ? a + Math.sqrt(x * (b - a) * (m - a)) : b - Math.sqrt((1 - x) * (b - a) * (b - m));
  };
  const pert = ({ min: a, moda: m, max: b }: Rango) => {
    if (b <= a) return a;
    const x = gamma(1 + (4 * (m - a)) / (b - a)), y = gamma(1 + (4 * (b - m)) / (b - a));
    return a + (b - a) * (x / (x + y));
  };
  return { u, tri, pert };
}

type Corrida = {
  costo: Float64Array; // egreso directo + administración (sin lo que depende del precio)
  pvCosto: Float64Array;
  factorIngreso: Float64Array; // VPN = precio × factorIngreso − pvCosto
  acumAntesPago: Float64Array; // costo acumulado hasta la semana anterior al pago final
  dur: Float64Array; rezago: Float64Array; trm: Float64Array; mult: Float64Array;
  ocurre: Float64Array[];
  partes: { nomina: number; herramientas: number; riesgos: number[]; administracion: number }; // sumas
};

export type Simulacion = { s: Supuestos; n: number; corridas: Record<Escenario, Corrida> };

export function simular(s: Supuestos, n = 10_000, semilla = 20261111): Simulacion {
  const { u, tri, pert } = muestreador(semilla);
  const d = 1 / (1 + tasaSemanal(s));
  const corridas = {} as Record<Escenario, Corrida>;
  for (const e of ESCENARIOS) {
    const p = s.escenarios[e];
    const k: Corrida = {
      costo: new Float64Array(n), pvCosto: new Float64Array(n), factorIngreso: new Float64Array(n), acumAntesPago: new Float64Array(n),
      dur: new Float64Array(n), rezago: new Float64Array(n), trm: new Float64Array(n), mult: new Float64Array(n),
      ocurre: s.riesgos.map(() => new Float64Array(n)),
      partes: { nomina: 0, herramientas: 0, riesgos: s.riesgos.map(() => 0), administracion: 0 },
    };
    for (let i = 0; i < n; i++) {
      const dur = Math.max(1, Math.round(pert(p.duracion)));
      const m: Muestra = {
        dur, rezago: Math.max(0, Math.round(tri(p.rezago))), trm: Math.round(tri(p.trm)), mult: tri(p.multRiesgo),
        ocurre: s.riesgos.map((r) => {
          let veces = 0;
          for (let j = r.momento === "mensual" ? meses(dur) : 1; j > 0; j--) if (u() < r.prob[e]) veces++;
          return veces;
        }),
      };
      const { c, partes } = costos(s, m);
      const pago = dur + m.rezago;
      let total = 0, pv = 0, antes = 0;
      for (let w = 1; w < c.length; w++) {
        total += c[w];
        pv += c[w] * d ** w;
        if (w < pago) antes += c[w];
      }
      k.costo[i] = total; k.pvCosto[i] = pv; k.acumAntesPago[i] = antes;
      k.factorIngreso[i] = (s.anticipo * d + (1 - s.anticipo) * d ** pago) * (1 - s.pctSobrePrecio);
      k.dur[i] = dur; k.rezago[i] = m.rezago; k.trm[i] = m.trm; k.mult[i] = m.mult;
      m.ocurre.forEach((v, j) => { k.ocurre[j][i] = v; k.partes.riesgos[j] += partes.riesgos[j]; });
      k.partes.nomina += partes.nomina; k.partes.herramientas += partes.herramientas; k.partes.administracion += partes.administracion;
    }
    corridas[e] = k;
  }
  return { s, n, corridas };
}

// Iteraciones de una vista. "Ponderado" toma de cada escenario la porción de su peso (las iteraciones son independientes).
function indices(sim: Simulacion, v: Vista): [Escenario, number][] {
  const sel = (e: Escenario, cuantas: number): [Escenario, number][] => Array.from({ length: cuantas }, (_, i) => [e, i]);
  if (v !== "ponderado") return sel(v, sim.n);
  const total = ESCENARIOS.reduce((a, e) => a + sim.s.pesos[e], 0) || 1;
  return ESCENARIOS.flatMap((e) => sel(e, Math.round((sim.s.pesos[e] / total) * sim.n)));
}

function cuantil(x: number[], q: number): number {
  const a = [...x].sort((p, r) => p - r);
  const h = (a.length - 1) * q, i = Math.floor(h);
  return i + 1 < a.length ? a[i] + (h - i) * (a[i + 1] - a[i]) : a[i];
}

const media = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;

// Precio con el que el VPN es 0 y precio con el que se llega a la meta de ROI, por iteración.
function preciosEquilibrio(sim: Simulacion, v: Vista) {
  const { metaRoi: m, pctSobrePrecio: vp } = sim.s;
  const den = 1 - vp * (1 + m);
  return indices(sim, v).map(([e, i]) => {
    const k = sim.corridas[e];
    return { vpn0: k.pvCosto[i] / k.factorIngreso[i], roiMeta: den > 0 ? (k.costo[i] * (1 + m)) / den : Infinity };
  });
}

const redondearMillon = (x: number) => Math.ceil(x / 1_000_000) * 1_000_000;

// Las condiciones son monótonas en el precio: "P(VPN>0) ≥ q" equivale a "precio ≥ cuantil q del precio de equilibrio".
export function preciosSugeridos(sim: Simulacion) {
  const pond = preciosEquilibrio(sim, "ponderado"), pes = preciosEquilibrio(sim, "pesimista");
  const q = (x: { vpn0: number; roiMeta: number }[], campo: "vpn0" | "roiMeta", p: number) => cuantil(x.map((r) => r[campo]), p);
  return {
    piso: redondearMillon(q(pond, "vpn0", REGLA.pisoVpnPos)),
    recomendado: redondearMillon(Math.max(q(pond, "vpn0", REGLA.pondVpnPos), q(pond, "roiMeta", REGLA.pondRoiMeta), q(pes, "vpn0", REGLA.pesVpnPos))),
    premium: redondearMillon(q(pes, "roiMeta", REGLA.premiumRoiMeta)),
  };
}

export type Resumen = {
  costoMedia: number; costoP10: number; costoP50: number; costoP90: number;
  vpnMedia: number; vpnP5: number; pVpnPos: number; roiP50: number; pRoiMeta: number;
  margenP50: number; exposicionP90: number; duracionP50: number;
};

export function resumen(sim: Simulacion, v: Vista, precio: number): Resumen {
  const { metaRoi, pctSobrePrecio: vp, anticipo } = sim.s;
  const costo: number[] = [], vpn: number[] = [], roi: number[] = [], margen: number[] = [], expo: number[] = [], dur: number[] = [];
  for (const [e, i] of indices(sim, v)) {
    const k = sim.corridas[e];
    const egreso = k.costo[i] + precio * vp;
    costo.push(egreso);
    vpn.push(precio * k.factorIngreso[i] - k.pvCosto[i]);
    roi.push((precio - egreso) / egreso);
    margen.push((precio - egreso) / precio);
    const neto = precio * (1 - vp);
    expo.push(Math.min(0, neto * anticipo - k.acumAntesPago[i], neto - k.costo[i]));
    dur.push(k.dur[i]);
  }
  return {
    costoMedia: media(costo), costoP10: cuantil(costo, 0.1), costoP50: cuantil(costo, 0.5), costoP90: cuantil(costo, 0.9),
    vpnMedia: media(vpn), vpnP5: cuantil(vpn, 0.05), pVpnPos: vpn.filter((x) => x > 0).length / vpn.length,
    roiP50: cuantil(roi, 0.5), pRoiMeta: roi.filter((x) => x >= metaRoi).length / roi.length,
    margenP50: cuantil(margen, 0.5), exposicionP90: cuantil(expo, 0.1), duracionP50: cuantil(dur, 0.5),
  };
}

// Probabilidad de ganar plata y de llegar a la meta, para una lista de precios (vista ponderada).
export function curvaPrecios(sim: Simulacion, desde: number, hasta: number, pasos = 40) {
  const eq = preciosEquilibrio(sim, "ponderado");
  return Array.from({ length: pasos + 1 }, (_, j) => {
    const precio = Math.round(desde + ((hasta - desde) * j) / pasos);
    return {
      precio,
      pVpnPos: eq.filter((r) => r.vpn0 < precio).length / eq.length,
      pRoiMeta: eq.filter((r) => r.roiMeta <= precio).length / eq.length,
    };
  });
}

// Costo esperado por concepto en la vista ponderada (sin lo que depende del precio).
export function desglose(sim: Simulacion) {
  const tot = ESCENARIOS.reduce((a, e) => a + sim.s.pesos[e], 0) || 1;
  const prom = (f: (k: Corrida) => number) => ESCENARIOS.reduce((a, e) => a + (sim.s.pesos[e] / tot) * (f(sim.corridas[e]) / sim.n), 0);
  return [
    { concepto: "Equipo", valor: prom((k) => k.partes.nomina) },
    { concepto: "Herramientas", valor: prom((k) => k.partes.herramientas) },
    ...sim.s.riesgos.map((r, j) => ({ concepto: r.nombre, valor: prom((k) => k.partes.riesgos[j]) })),
    { concepto: "Administración", valor: prom((k) => k.partes.administracion) },
  ];
}

function rangos(x: ArrayLike<number>): number[] {
  const ord = Array.from(x, (v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(ord.length);
  for (let i = 0; i < ord.length; ) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1][0] === ord[i][0]) j++;
    for (let t = i; t <= j; t++) r[ord[t][1]] = (i + j) / 2; // empates: rango promedio
    i = j + 1;
  }
  return r;
}

function spearman(x: ArrayLike<number>, y: ArrayLike<number>): number {
  const a = rangos(x), b = rangos(y), ma = media(a), mb = media(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

// Qué mueve el precio de equilibrio DENTRO del escenario probable. El Excel lo mide sobre la mezcla de escenarios
// y casi todo sale correlacionado (−0,6 a −0,9) porque el pesimista sube todo a la vez; así no se ve qué pesa.
export function sensibilidad(sim: Simulacion) {
  const k = sim.corridas.probable;
  const eq = Array.from(k.pvCosto, (pv, i) => pv / k.factorIngreso[i]);
  return [
    { variable: "Duración del desarrollo", rho: spearman(k.dur, eq) },
    { variable: "Rezago del pago", rho: spearman(k.rezago, eq) },
    { variable: "TRM", rho: spearman(k.trm, eq) },
    { variable: "Severidad de los riesgos", rho: spearman(k.mult, eq) },
    ...sim.s.riesgos.map((r, j) => ({ variable: r.nombre, rho: spearman(k.ocurre[j], eq) })),
  ].sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
}
