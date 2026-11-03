// Prueba con: node --experimental-strip-types scripts/test-leads-web.mjs
import assert from "node:assert/strict";
import { secretoValido } from "../src/lib/leads/secreto.ts";
import { leadWebSchema, actualizarLeadSchema } from "../src/lib/leads/schemas.ts";

assert.equal(secretoValido("abc", "abc"), true);
assert.equal(secretoValido("abd", "abc"), false);
assert.equal(secretoValido(null, "abc"), false);
assert.equal(secretoValido("abc", undefined), false);
assert.equal(secretoValido("", ""), false);

const lead = { nombre: "Ana", email: "ANA@EJEMPLO.COM ", asunto: "Hola", mensaje: "Quiero automatizar", autorizacion: true };
assert.equal(leadWebSchema.parse(lead).email, "ana@ejemplo.com");
assert.equal(leadWebSchema.safeParse({ ...lead, autorizacion: false }).success, false);
assert.equal(leadWebSchema.safeParse({ ...lead, email: "no" }).success, false);
assert.equal(leadWebSchema.safeParse({ ...lead, mensaje: "x".repeat(5001) }).success, false);
assert.equal(actualizarLeadSchema.safeParse({ estado: "borrado" }).success, false);
console.log("ok: leads web");
