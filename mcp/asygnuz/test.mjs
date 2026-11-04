// Corre el servidor real contra una API falsa: nunca toca la plataforma.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const vistas = [];
const api = createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (d) => (cuerpo += d));
  req.on("end", () => {
    vistas.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, cuerpo });
    res.statusCode = req.url.includes("negado") || cuerpo.includes("solo-lectura") ? 403 : 200;
    res.end(JSON.stringify(res.statusCode === 200 ? { ok: true } : { error: "Este token es de solo lectura" }));
  });
});
await new Promise((r) => api.listen(0, "127.0.0.1", r));

const cliente = new Client({ name: "test", version: "1" });
await cliente.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: ["server.mjs"],
    env: { ASYGNUZ_AGENTE_TOKEN: "asg_ag_prueba", ASYGNUZ_API_URL: `http://127.0.0.1:${api.address().port}` },
  })
);

const { tools } = await cliente.listTools();
assert.deepEqual(tools.map((t) => t.name).sort(), [
  "actualizar_flujo", "actualizar_pieza", "contexto", "crear_flujo", "crear_pieza", "listar_flujos", "listar_parrilla", "ver_avance",
]);
assert.equal(tools.some((t) => /borrar|eliminar|publicar_/.test(t.name)), false);

await cliente.callTool({ name: "listar_parrilla", arguments: { desde: "2026-11-01", estado: "revision" } });
let v = vistas.at(-1);
assert.equal(v.metodo, "GET");
assert.equal(v.url, "/api/agente/parrilla?desde=2026-11-01&estado=revision");
assert.equal(v.auth, "Bearer asg_ag_prueba");

const id = "11111111-1111-4111-8111-111111111111";
await cliente.callTool({ name: "actualizar_pieza", arguments: { id, estado: "programado" } });
v = vistas.at(-1);
assert.equal(v.metodo, "PATCH");
assert.equal(v.url, `/api/agente/parrilla/${id}`);
assert.deepEqual(JSON.parse(v.cuerpo), { estado: "programado" }); // el id va en la URL y no pisa campos

await cliente.callTool({ name: "actualizar_flujo", arguments: { id, activo: false } });
v = vistas.at(-1);
assert.equal(v.metodo, "PATCH");
assert.equal(v.url, `/api/agente/flujos/${id}`);
assert.deepEqual(JSON.parse(v.cuerpo), { activo: false });

await cliente.callTool({ name: "crear_flujo", arguments: { nombre: "Guía", palabras_clave: ["GUIA"], respuesta_privada: "Hola" } });
v = vistas.at(-1);
assert.equal(v.metodo, "POST");
assert.equal(v.url, "/api/agente/flujos");
assert.equal("activo" in JSON.parse(v.cuerpo), false); // apagado lo decide la API, no este servidor

const negado = await cliente.callTool({ name: "crear_pieza", arguments: { titulo: "solo-lectura" } });
assert.equal(negado.isError, true);
assert.match(negado.content[0].text, /403/);

await cliente.close();
api.close();

// Sin token ni https, el servidor no arranca.
const { spawnSync } = await import("node:child_process");
const arrancar = (env) => spawnSync(process.execPath, ["server.mjs"], { env, encoding: "utf8", timeout: 5000 });
assert.equal(arrancar({}).status, 1);
assert.match(arrancar({ ASYGNUZ_AGENTE_TOKEN: "x", ASYGNUZ_API_URL: "http://app.asygnuz.com" }).stderr, /https/);
console.log("ok: servidor MCP");
