// Valida src/lib/casos/modelo.ts contra Pricing_MonteCarlo_Proyecto.xlsx (2026-11-11).
// Uso: node scripts/test-casos-modelo.mjs   (Node ≥ 23 corre el .ts directo)
import assert from "node:assert/strict";
import { PLANTILLA, indicadores, simular, preciosSugeridos, resumen } from "../src/lib/casos/modelo.ts";

// El Excel divide el sueldo mensual entre 4 semanas y no carga administración al costo.
const excel = { ...PLANTILLA, semanasPorMes: 4, administracion: 0 };
const cerca = (real, esperado, tol, que) => assert.ok(Math.abs(real - esperado) <= tol, `${que}: ${real} vs ${esperado}`);

// Hoja Indicadores (determinista, precio 69 M).
const det = {
  pesimista: { costo: 46_230_000, vpn: 19_823_569.72, roi: 0.49254, payback: 22, tir: 0.15193 },
  probable: { costo: 30_689_000, vpn: 36_461_166.66, roi: 1.24836, payback: 12, tir: 0.70615 },
  optimista: { costo: 17_397_250, vpn: 50_374_929.89, roi: 2.96614, payback: 7, tir: 3.38652 },
};
for (const [e, x] of Object.entries(det)) {
  const r = indicadores(excel, e, 69_000_000);
  cerca(r.costo, x.costo, 1, `${e} costo`);
  cerca(r.vpn, x.vpn, 1, `${e} VPN`);
  cerca(r.roi, x.roi, 1e-4, `${e} ROI`);
  assert.equal(r.payback, x.payback, `${e} payback`);
  cerca(r.tirMensual, x.tir, 1e-3, `${e} TIR mensual`);
  assert.equal(r.exposicion, -x.costo, `${e} exposición`);
}

// Hojas Costos_MC y Resumen_MonteCarlo (10.000 iteraciones; otra semilla, así que con tolerancia).
const sim = simular(excel);
const mc = { pesimista: 53_667_770, probable: 31_660_593, optimista: 14_594_293 };
for (const [e, costo] of Object.entries(mc)) cerca(resumen(sim, e, 69_000_000).costoMedia, costo, costo * 0.015, `${e} costo medio MC`);
const p = preciosSugeridos(sim);
console.log("precios sugeridos (Excel: piso 58 M, recomendado 69 M, premium 83 M):", p);
cerca(p.piso, 58_000_000, 1_000_000, "piso");
cerca(p.recomendado, 69_000_000, 1_000_000, "recomendado");
cerca(p.premium, 83_000_000, 1_000_000, "premium");
const pond = resumen(sim, "ponderado", 69_000_000);
cerca(pond.pVpnPos, 0.9959, 0.01, "P(VPN>0) ponderado");
cerca(pond.pRoiMeta, 0.8086, 0.02, "P(ROI≥40%) ponderado");

// Anticipo del 50 %: la caja a financiar debe bajar y el VPN subir.
const conAnticipo = indicadores({ ...excel, anticipo: 0.5 }, "probable", 69_000_000);
assert.ok(conAnticipo.vpn > det.probable.vpn && conAnticipo.exposicion > -det.probable.costo, "anticipo");

console.log("ok: el modelo replica el Excel");
