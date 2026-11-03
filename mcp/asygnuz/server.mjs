#!/usr/bin/env node
// Servidor MCP del dashboard: traduce herramientas a /api/agente/*.
// El alcance lo decide el token en el servidor; aquí no hay lógica de permisos.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const TOKEN = process.env.ASYGNUZ_AGENTE_TOKEN;
const API = (process.env.ASYGNUZ_API_URL || "https://app.asygnuz.com").replace(/\/$/, "");

if (!TOKEN) {
  console.error("Falta ASYGNUZ_AGENTE_TOKEN (se genera en /portal-admin).");
  process.exit(1);
}
const { protocol, hostname } = new URL(API);
if (protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1") {
  console.error("ASYGNUZ_API_URL debe usar https para no enviar el token en claro.");
  process.exit(1);
}

async function llamar(metodo, ruta, { query, body } = {}) {
  const url = new URL(`${API}/api/agente/${ruta}`);
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined) url.searchParams.set(clave, valor);
  }
  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error", // un redirect podría llevarse el token a otro host
    });
    const texto = await res.text();
    return { isError: !res.ok, content: [{ type: "text", text: res.ok ? texto : `Error ${res.status}: ${texto}` }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `No se pudo conectar con ${API}: ${err.message}` }] };
  }
}

const ESTADO = z.enum(["idea", "grabacion", "edicion", "revision", "programado", "publicado"]);
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// Mismos campos que crearContenidoSchema; la validación completa la hace la API.
const CAMPOS_PIEZA = {
  tipo: z.string().optional().describe("Formato, ej. reel o carrusel"),
  plataforma: z.string().optional(),
  fechaPublicacion: FECHA.optional().or(z.literal("")),
  hora: z.string().optional().describe("HH:MM"),
  estado: ESTADO.optional(),
  pilar: z.string().optional(),
  copy: z.string().optional(),
  notas: z.string().optional(),
  link: z.string().optional().describe("Publicación ya hecha"),
  linkReferencia: z.string().optional().describe("Video o imagen de referencia"),
  linkDrive: z.string().optional().describe("Carpeta con las piezas"),
};

const server = new McpServer({ name: "asygnuz", version: "1.0.0" });
const lectura = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const escritura = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

server.registerTool(
  "contexto",
  {
    description: "Portal de este token: nombre, si puede editar, pilares y guía de marca. Llamar primero.",
    annotations: lectura,
  },
  () => llamar("GET", "contexto")
);

server.registerTool(
  "listar_parrilla",
  {
    description: "Lista las piezas de la parrilla de contenido, con filtros opcionales.",
    inputSchema: { desde: FECHA.optional(), hasta: FECHA.optional(), estado: ESTADO.optional() },
    annotations: lectura,
  },
  (query) => llamar("GET", "parrilla", { query })
);

server.registerTool(
  "crear_pieza",
  {
    description: "Crea una pieza en la parrilla. No publica nada en Instagram. Pide aprobación a la persona antes de usarla.",
    inputSchema: { titulo: z.string(), ...CAMPOS_PIEZA },
    annotations: escritura,
  },
  (body) => llamar("POST", "parrilla", { body })
);

server.registerTool(
  "actualizar_pieza",
  {
    description: "Cambia solo los campos enviados de una pieza. No publica nada en Instagram. Pide aprobación a la persona antes de usarla.",
    inputSchema: { id: z.string().uuid(), titulo: z.string().optional(), ...CAMPOS_PIEZA },
    annotations: { ...escritura, idempotentHint: true },
  },
  ({ id, ...body }) => llamar("PATCH", `parrilla/${id}`, { body })
);

server.registerTool(
  "listar_flujos",
  {
    description: "Flujos automáticos de Instagram del portal (palabras clave, respuestas) y clics de sus enlaces. Solo lectura.",
    annotations: lectura,
  },
  () => llamar("GET", "flujos")
);

server.registerTool(
  "ver_avance",
  {
    description: "Métricas de Instagram, estado de la parrilla y tareas de Kaneo del portal. No incluye pauta ni presupuesto.",
    inputSchema: { periodo: z.enum(["7d", "30d", "90d", "mes"]).optional() },
    annotations: lectura,
  },
  (query) => llamar("GET", "avance", { query })
);

await server.connect(new StdioServerTransport());
