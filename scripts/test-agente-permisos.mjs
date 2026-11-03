import assert from "node:assert/strict";
import { denegarEnBandeja, denegarEnPortal, tokenVencido } from "../src/lib/agente/permisos.ts";

const bandeja = { tenant_id: null, puede_escribir: false };
const lectura = { tenant_id: "t1", puede_escribir: false };
const edicion = { tenant_id: "t1", puede_escribir: true };

// La bandeja ve todas las cuentas: un token de portal nunca entra.
assert.equal(denegarEnBandeja(bandeja), null);
assert.equal(denegarEnBandeja(lectura)?.status, 403);
assert.equal(denegarEnBandeja(edicion)?.status, 403);

// Un token de bandeja no entra a rutas de portal, ni con escritura marcada.
assert.equal(denegarEnPortal(bandeja, false)?.status, 403);
assert.equal(denegarEnPortal({ tenant_id: null, puede_escribir: true }, true)?.status, 403);

assert.equal(denegarEnPortal(lectura, false), null);
assert.equal(denegarEnPortal(lectura, true)?.status, 403);
assert.equal(denegarEnPortal(edicion, true), null);
// Vencimiento: null no vence, el borde ya cuenta como vencido y una fecha rota no da acceso.
const ahora = Date.parse("2026-11-03T12:00:00Z");
assert.equal(tokenVencido(null, ahora), false);
assert.equal(tokenVencido("2027-11-03T12:00:00Z", ahora), false);
assert.equal(tokenVencido("2026-11-03T12:00:00Z", ahora), true);
assert.equal(tokenVencido("2026-11-02T12:00:00Z", ahora), true);
assert.equal(tokenVencido("no-es-fecha", ahora), true);

console.log("ok: permisos de tokens de agente");
