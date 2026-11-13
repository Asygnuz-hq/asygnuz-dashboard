// Valida mensualidad.ts y valor.ts con casos que se pueden sacar a mano (2026-11-13).
// Uso: node --import ./scripts/ts-ext-hook.mjs scripts/test-casos-mensualidad.mjs
import assert from "node:assert/strict";
import { PLANTILLA_MENSUALIDAD, simularMensualidad, feesSugeridos, resumenMensualidad, costoMes } from "../src/lib/casos/mensualidad.ts";
import { PLANTILLA_VALOR, simularValor, resumenValor, inversionMensualidad, inversionProyecto } from "../src/lib/casos/valor.ts";

const fijo = (x) => ({ min: x, moda: x, max: x });
// 1) Sin azar, sin descuento, sin churn: el cliente se queda los 12 meses. Costo/mes = 2 M; montaje 1,2 M.
const s = {
  ...PLANTILLA_MENSUALIDAD,
  equipo: [{ nombre: "X", pagoMensual: 3_520_000, horasMes: 100 }], horasMesCompleto: 176, // 2 M/mes
  herramientas: [], otrosMes: 0, administracion: 0, pctSobrePrecio: 0, tasaDescuentoEA: 0,
  montaje: { cobro: 0, costo: 1_200_000 }, churnMinimo: 0, churn: fijo(0), alcanceExtra: fijo(0), trm: fijo(4000), horizonte: 12, metaRoi: 0.4,
};
assert.equal(Math.round(costoMes(s, 0, 4000).total), 2_000_000);
const sim = simularMensualidad(s, 2000);
const f = feesSugeridos(sim);
// VPN 0: (12 × 2 M + 1,2 M) / 12 = 2,1 M. Meta 40 %: 25,2 M × 1,4 / 12 = 2,94 M.
assert.equal(f.piso, 2_100_000, "piso");
assert.equal(f.recomendado, 3_000_000, "recomendado (2,94 M redondeado)");
const r = resumenMensualidad(sim, 3_000_000);
assert.equal(r.mesesMedia, 12); assert.equal(r.pVpnPos, 1); assert.equal(r.recuperaMontaje, 2);
// 2) Con churn: el cliente medio se va antes y el fee de equilibrio sube.
const s2 = { ...s, churn: fijo(0.1) };
const f2 = feesSugeridos(simularMensualidad(s2, 5000));
assert.ok(f2.recomendado > f.recomendado, `churn sube el fee: ${f2.recomendado}`);
console.log("mensualidad:", f, "con churn 10 %:", f2);

// 3) Valor: beneficio fijo 1 M/mes desde el mes 1, sin rampa ni descuento, 12 meses = 12 M. Paga 3 M/mes? no: proyecto 6 M.
const v = { ...PLANTILLA_VALOR, beneficios: [{ nombre: "b", mensual: fijo(1_000_000), prob: 1, nota: "" }], inicioMes: 1, rampa: fijo(1), horizonte: 12, tasaDescuentoEA: 0 };
const sv = simularValor(v, inversionProyecto(v, 1, 0), 1000);
const rv = resumenValor(sv, 6_000_000);
assert.equal(Math.round(rv.vpnMedia), 6_000_000); assert.equal(Math.round(rv.techo), 12_000_000); assert.equal(Math.round(rv.precio3x), 4_000_000);
assert.equal(rv.recuperaMes, 6); assert.equal(rv.pPierde, 0);
// Mensualidad de 0,5 M/mes por 12 meses: paga 6 M, gana 12 M.
const rm = resumenValor(simularValor(v, inversionMensualidad(v, 0), 1000), 500_000);
assert.equal(Math.round(rm.vpnMedia), 6_000_000); assert.equal(Math.round(rm.techo), 1_000_000);
console.log("ok: mensualidad y valor cuadran con los cálculos a mano");
