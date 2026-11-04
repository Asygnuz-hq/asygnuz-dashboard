// Corre las rutas reales de /api/agente/flujos contra un Supabase falso en memoria:
// nunca toca la plataforma, aunque exista .env.local.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (!especificador.startsWith("@/")) return siguiente(especificador, contexto);
    const ruta = join(SRC, `${especificador.slice(2)}.ts`);
    assert.ok(existsSync(ruta), `No existe ${ruta}`);
    return { url: pathToFileURL(ruta).href, shortCircuit: true };
  },
});

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [PORTAL, OTRO_PORTAL] = [uuid(1), uuid(2)];
const [CUENTA, CUENTA_AJENA, CUENTA_ANUNCIOS] = [uuid(11), uuid(12), uuid(13)];
const [FLUJO_AGENTE, FLUJO_AJENO] = [uuid(21), uuid(22)];
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const tokenFila = (id, crudo, tenant_id, puede_escribir) => ({
  id, token_hash: sha(crudo), user_id: uuid(90), nombre: id, revocado: false, tenant_id, puede_escribir, expira_en: null,
});

const flujoBase = { botones: [], respuesta_publica: [], aplica_a: "todas", activo: true };
const db = {
  tokens_agente: [
    tokenFila(uuid(31), "edita", PORTAL, true),
    tokenFila(uuid(32), "lee", PORTAL, false),
    tokenFila(uuid(33), "bandeja", null, true),
  ],
  profiles: [{ id: uuid(90), gestiona_portales: true }],
  agente_auditoria: [],
  // Como en producción: el portal aún no está vinculado a su cuenta.
  portal_meta_conexiones: [{ tenant_id: OTRO_PORTAL, conexion_id: CUENTA_AJENA }],
  meta_conexiones: [
    { id: CUENTA, instagram_business_id: "1" },
    { id: CUENTA_AJENA, instagram_business_id: "2" },
    { id: CUENTA_ANUNCIOS, instagram_business_id: null },
  ],
  ig_flujos: [
    { ...flujoBase, id: FLUJO_AGENTE, tenant_id: null, conexion_id: CUENTA, nombre: "AGENTE", palabras_clave: ["AGENTE"], respuesta_privada: "Prompts" },
    { ...flujoBase, id: FLUJO_AJENO, tenant_id: null, conexion_id: CUENTA_AJENA, nombre: "Ajeno", palabras_clave: ["ORDEN"], respuesta_privada: "Hola" },
  ],
  ig_links_tracking: [
    { id: uuid(41), flujo_id: FLUJO_AGENTE, url_destino: "https://a.co/guia", titulo: "Guía", clics_count: 2, por_envio: false },
    { id: uuid(42), flujo_id: FLUJO_AGENTE, url_destino: "https://a.co/guia", titulo: "Guía", clics_count: 5, por_envio: true },
    { id: uuid(43), flujo_id: FLUJO_AGENTE, url_destino: "https://a.co/guia", titulo: "Guía", clics_count: 0, por_envio: true },
    { id: uuid(44), flujo_id: FLUJO_AJENO, url_destino: "https://b.co", titulo: "Ajeno", clics_count: 9, por_envio: false },
  ],
};

// Lo mínimo de PostgREST que usan estas rutas.
function cumple(fila, campo, expresion) {
  if (expresion.startsWith("not.is.null")) return fila[campo] != null;
  const [op, ...resto] = expresion.split(".");
  const valor = resto.join(".");
  if (op === "eq") return String(fila[campo]) === valor;
  if (op === "gt") return Number(fila[campo]) > Number(valor);
  if (op === "in") return valor.replace(/[()"]/g, "").split(",").includes(String(fila[campo]));
  throw new Error(`Filtro no soportado: ${campo}=${expresion}`);
}
function cumpleOr(fila, expresion) {
  // Separa por comas fuera de paréntesis: tenant_id.eq.x,conexion_id.in.(a,b)
  return expresion.slice(1, -1).match(/[^,(]+(\([^)]*\))?/g).some((parte) => {
    const [campo, ...resto] = parte.split(".");
    return cumple(fila, campo, resto.join("."));
  });
}
let secuencia = 100;
const supabase = createServer((req, res) => {
  let texto = "";
  req.on("data", (d) => (texto += d));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    const tabla = url.pathname.split("/").at(-1);
    assert.ok(db[tabla], `Tabla inesperada: ${tabla}`);
    const coincide = (f) => [...url.searchParams].every(([k, v]) =>
      ["select", "columns", "order", "limit"].includes(k) || (k === "or" ? cumpleOr(f, v) : cumple(f, k, v)));
    let filas;
    if (req.method === "POST") {
      const nuevas = [JSON.parse(texto)].flat().map((f) => ({ id: uuid(secuencia++), clics_count: 0, por_envio: false, ...f }));
      db[tabla].push(...nuevas);
      filas = nuevas;
    } else if (req.method === "PATCH") {
      filas = db[tabla].filter(coincide);
      filas.forEach((f) => Object.assign(f, JSON.parse(texto)));
    } else if (req.method === "DELETE") {
      filas = db[tabla].filter(coincide);
      db[tabla] = db[tabla].filter((f) => !filas.includes(f));
    } else {
      filas = db[tabla].filter(coincide);
    }
    res.setHeader("content-type", "application/json");
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
      if (filas.length !== 1) {
        res.statusCode = 406;
        return res.end(JSON.stringify({ code: "PGRST116", details: `The result contains ${filas.length} rows`, message: "JSON object requested" }));
      }
      return res.end(JSON.stringify(filas[0]));
    }
    res.end(JSON.stringify(filas));
  });
});
await new Promise((r) => supabase.listen(0, "127.0.0.1", r));
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${supabase.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = "falsa";

const flujos = await import("../src/app/api/agente/flujos/route.ts");
const porId = await import("../src/app/api/agente/flujos/[id]/route.ts");
const pedir = (token, metodo, cuerpo) =>
  new Request("http://x/api/agente/flujos", {
    method: metodo,
    headers: { authorization: `Bearer ${token}` },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
const crear = async (cuerpo, token = "edita") => {
  const r = await flujos.POST(pedir(token, "POST", cuerpo));
  return { status: r.status, ...(await r.json()) };
};
const editar = async (id, cuerpo, token = "edita") => {
  const r = await porId.PATCH(pedir(token, "PATCH", cuerpo), { params: Promise.resolve({ id }) });
  return { status: r.status, ...(await r.json()) };
};
const listar = async () => (await flujos.GET(pedir("lee", "GET"))).json();
const valido = { nombre: "Guía", palabras_clave: ["GUIA"], respuesta_privada: "Aquí va" };

// El caso de producción: el flujo existe, pero sin vínculo el portal no lo ve ni puede crear.
assert.deepEqual(await listar(), { flujos: [], enlaces: [] });
assert.equal((await crear(valido)).status, 409);
assert.equal((await editar(FLUJO_AGENTE, { activo: false })).status, 404);
assert.equal(db.ig_flujos.find((f) => f.id === FLUJO_AGENTE).activo, true);

db.portal_meta_conexiones.push({ tenant_id: PORTAL, conexion_id: CUENTA }, { tenant_id: PORTAL, conexion_id: CUENTA_ANUNCIOS });

// Con el vínculo aparece solo lo de su cuenta, y un renglón por botón con los clics sumados.
const lista = await listar();
assert.deepEqual(lista.flujos.map((f) => f.id), [FLUJO_AGENTE]);
assert.deepEqual(lista.enlaces.map((l) => [l.id, l.clics_count]), [[uuid(41), 7]]);
assert.equal("por_envio" in lista.enlaces[0], false);

// Permisos del token.
assert.equal((await crear(valido, "lee")).status, 403);
assert.equal((await crear(valido, "bandeja")).status, 403);
assert.equal((await editar(FLUJO_AGENTE, { activo: false }, "lee")).status, 403);

// Aislamiento: ni crear en otra cuenta, ni ver o editar sus flujos, ni moverlos de cuenta.
const antes = JSON.stringify(db.ig_flujos);
assert.equal((await crear({ ...valido, conexion_id: CUENTA_AJENA })).status, 403);
assert.equal((await editar(FLUJO_AJENO, { nombre: "Mío" })).status, 404);
assert.equal((await editar(FLUJO_AGENTE, { conexion_id: CUENTA_AJENA })).status, 400);
assert.equal((await editar(FLUJO_AGENTE, { tenant_id: OTRO_PORTAL })).status, 400);
assert.equal((await editar(FLUJO_AGENTE, { nombre: "Otro", conexion_id: CUENTA_AJENA })).status, 400);
assert.equal((await crear({ ...valido, tenant_id: OTRO_PORTAL })).status, 400);
assert.equal(JSON.stringify(db.ig_flujos), antes);

// Validación.
for (const malo of [
  { palabras_clave: [] },
  { palabras_clave: ["!!!"] },
  { aplica_a: "publicacion" },
  { respuesta_privada: " " },
  { respuesta_privada: "x".repeat(1001) },
  { respuesta_privada: "x".repeat(950), botones: [{ titulo: "Guía", url: "https://a.co" }] },
  { botones: [{ titulo: "Guía", url: "http://a.co" }] },
  { botones: [{ titulo: "Guía", url: "javascript:alert(1)" }] },
]) {
  assert.equal((await crear({ ...valido, ...malo })).status, 400, JSON.stringify(malo).slice(0, 60));
}
assert.equal((await editar(FLUJO_AGENTE, {})).status, 400);
assert.equal(JSON.stringify(db.ig_flujos), antes);

// Crear: nace apagado, con el tenant del token, enlaces rastreados y auditoría.
const creado = await crear({
  ...valido,
  palabras_clave: ["GUIA", " guía "],
  respuesta_publica: ["Te escribí", "Revisa tu DM"],
  botones: [{ titulo: "Abrir", url: "https://a.co/abrir" }],
});
assert.equal(creado.status, 201);
assert.equal(creado.flujo.activo, false);
assert.equal(creado.flujo.tenant_id, PORTAL);
assert.equal(creado.flujo.conexion_id, CUENTA);
assert.deepEqual(creado.flujo.palabras_clave, [" guía ".trim()]);
assert.equal(db.ig_links_tracking.filter((l) => l.flujo_id === creado.flujo.id).length, 1);
assert.equal(db.agente_auditoria.at(-1).accion, "flujo.crear");
assert.equal(db.agente_auditoria.at(-1).tenant_id, PORTAL);

// Apagado no compite; prendido, sí: el motor elegiría entre los dos sin orden.
const choca = await crear({ ...valido, palabras_clave: ["agente"] });
assert.equal(choca.status, 201);
assert.equal((await editar(choca.flujo.id, { activo: true })).status, 409);
assert.equal((await crear({ ...valido, palabras_clave: ["Agénte IA"], activo: true })).status, 409);
assert.equal(db.ig_flujos.find((f) => f.id === choca.flujo.id).activo, false);
// Un canal distinto no compite salvo que alguno escuche en todos.
assert.equal((await editar(choca.flujo.id, { aplica_a: "mensajes", palabras_clave: ["otra"], activo: true })).status, 200);
assert.equal((await crear({ ...valido, palabras_clave: ["otra"], aplica_a: "comentarios", activo: true })).status, 201);

// Editar: solo lo enviado, y sin perder el link de un botón que sigue igual ni su historial.
const editado = await editar(FLUJO_AGENTE, {
  botones: [{ titulo: "Guía", url: "https://a.co/guia" }, { titulo: "Nuevo", url: "https://a.co/nuevo" }],
});
assert.equal(editado.status, 200);
assert.equal(editado.flujo.respuesta_privada, "Prompts");
assert.ok(db.ig_links_tracking.some((l) => l.id === uuid(41)));
assert.ok(db.ig_links_tracking.some((l) => l.id === uuid(42)));
assert.ok(db.ig_links_tracking.some((l) => l.titulo === "Nuevo" && l.flujo_id === FLUJO_AGENTE));
const quitado = await editar(FLUJO_AGENTE, { botones: [{ titulo: "Nuevo", url: "https://a.co/nuevo" }] });
assert.equal(quitado.status, 200);
assert.equal(db.ig_links_tracking.some((l) => l.id === uuid(41)), false);
assert.ok(db.ig_links_tracking.some((l) => l.id === uuid(42)));
assert.equal(db.agente_auditoria.at(-1).accion, "flujo.actualizar");

// Editar el texto de un flujo sin tocar sus palabras no choca consigo mismo.
assert.equal((await editar(FLUJO_AGENTE, { nombre: "AGENTE v2" })).status, 200);
// Un flujo antiguo con un DM demasiado largo no se puede prender, pero sí apagar.
db.ig_flujos.find((f) => f.id === FLUJO_AGENTE).respuesta_privada = "x".repeat(1001);
assert.equal((await editar(FLUJO_AGENTE, { nombre: "AGENTE v3" })).status, 400);
assert.equal((await editar(FLUJO_AGENTE, { activo: false })).status, 200);
assert.equal((await editar(FLUJO_AGENTE, { activo: true })).status, 400);
// Con varias cuentas de Instagram hay que elegir; la de anuncios no cuenta.
db.meta_conexiones.find((c) => c.id === CUENTA_ANUNCIOS).instagram_business_id = "3";
assert.equal((await crear(valido)).status, 400);
assert.equal((await crear({ ...valido, conexion_id: CUENTA_ANUNCIOS })).status, 201);

supabase.close();
console.log("ok: flujos del agente");
