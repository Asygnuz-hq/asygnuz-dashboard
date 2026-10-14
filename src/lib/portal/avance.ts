import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProjectTasks, type KaneoConfig, type KaneoTask } from "@/lib/kaneo/client";
import {
  fetchInsights,
  fetchInstagramMedia,
  fetchInstagramTendenciaCuenta,
  fetchMonedaCuentaAnuncios,
  type MetaConexion,
} from "@/lib/meta/client";
import type {
  AvanceCliente,
  BloqueContenido,
  BloqueCuenta,
  BloquePauta,
  BloqueTrabajo,
  TareaAvance,
} from "./avanceTipos";

// Arma el Panel de Avance de UN cliente (tenant). Corre solo en servidor
// con el cliente de servicio: quien llama (la ruta) ya comprobó que la
// sesión puede ver este tenantId — aquí no se vuelve a validar.
//
// Fuentes:
//   - Kaneo: proyectos del Kaneo de ASYGNUZ amarrados en portal_kaneo_proyectos
//     (se lee con las credenciales del tenant ASYGNUZ, el cliente no tiene
//     Kaneo propio).
//   - Meta: conexiones amarradas en portal_meta_conexiones (anuncios e Instagram).
//   - Parrilla: portal_contenido del tenant.
// Cada bloque falla por separado: si Meta se cae, el resto se muestra igual.

const SLUG_ASYGNUZ = "asygnuz";
const DIAS_PROXIMAS = 14;

// action_type de Meta que cuentan como "resultado" para un cliente de
// Growth: conversaciones iniciadas (WhatsApp/Messenger/IG), leads y compras.
const ACCIONES_RESULTADO = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "offsite_conversion.fb_pixel_purchase",
  "purchase",
]);

export async function calcularAvance(tenantId: string): Promise<AvanceCliente> {
  const admin = createAdminClient();

  const [proyectosRes, conexionesRes, contenidoRes] = await Promise.all([
    admin
      .from("portal_kaneo_proyectos")
      .select("kaneo_project_id, kaneo_project_nombre")
      .eq("tenant_id", tenantId),
    admin.from("portal_meta_conexiones").select("conexion_id").eq("tenant_id", tenantId),
    admin.from("portal_contenido").select("estado, fecha_publicacion").eq("tenant_id", tenantId),
  ]);

  const proyectos = proyectosRes.data ?? [];
  const conexionIds = (conexionesRes.data ?? []).map((c) => c.conexion_id as string);

  let conexiones: MetaConexion[] = [];
  if (conexionIds.length > 0) {
    const { data } = await admin.from("meta_conexiones").select("*").in("id", conexionIds);
    conexiones = (data as MetaConexion[]) ?? [];
  }

  const [trabajo, pauta, cuenta] = await Promise.all([
    bloqueTrabajo(proyectos),
    bloquePauta(conexiones),
    bloqueCuenta(conexiones),
  ]);
  const contenido = bloqueContenido(contenidoRes.data ?? [], cuenta.publicadasMes);

  return {
    generadoEn: new Date().toISOString(),
    trabajo,
    contenido,
    pauta,
    cuenta: cuenta.bloque,
  };
}

export async function kaneoAsygnuz(): Promise<{ config: KaneoConfig; workspaceId: string } | null> {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("slug", SLUG_ASYGNUZ).maybeSingle();
  if (!tenant) return null;
  const { data: fila } = await admin
    .from("tenant_kaneo")
    .select("kaneo_api_url, kaneo_api_key, kaneo_workspace_id")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!fila) return null;
  return {
    config: { apiUrl: fila.kaneo_api_url, apiKey: fila.kaneo_api_key },
    workspaceId: fila.kaneo_workspace_id,
  };
}

function estadoDeTarea(status: string): TareaAvance["estado"] {
  if (status === "done") return "hecha";
  if (status === "in-progress") return "en-curso";
  if (status === "in-review") return "en-revision";
  return "por-hacer";
}

async function bloqueTrabajo(
  proyectos: { kaneo_project_id: string; kaneo_project_nombre: string }[]
): Promise<BloqueTrabajo> {
  const vacio: BloqueTrabajo = {
    conectado: proyectos.length > 0,
    hechas: 0,
    enCurso: 0,
    enRevision: 0,
    porHacer: 0,
    atrasadas: 0,
    ultimasHechas: [],
    enMarcha: [],
    proximas: [],
    error: null,
  };
  if (proyectos.length === 0) return vacio;

  const kaneo = await kaneoAsygnuz();
  if (!kaneo) return { ...vacio, error: "Kaneo de ASYGNUZ no está configurado." };

  let tareas: (KaneoTask & { proyecto: string })[];
  try {
    const porProyecto = await Promise.all(
      proyectos.map(async (p) =>
        (await fetchProjectTasks(kaneo.config, p.kaneo_project_id)).map((t) => ({
          ...t,
          proyecto: limpiarNombreProyecto(p.kaneo_project_nombre),
        }))
      )
    );
    tareas = porProyecto.flat();
  } catch {
    return { ...vacio, error: "No se pudo leer Kaneo en este momento." };
  }

  const ahora = Date.now();
  const limiteProximas = ahora + DIAS_PROXIMAS * 86400000;
  const aVista = (t: KaneoTask & { proyecto: string }): TareaAvance => ({
    titulo: t.title,
    estado: estadoDeTarea(t.status),
    fechaLimite: t.dueDate,
    proyecto: t.proyecto,
  });

  const hechas = tareas.filter((t) => t.status === "done");
  const pendientes = tareas.filter((t) => t.status !== "done");
  const conFecha = pendientes.filter((t) => t.dueDate);

  return {
    ...vacio,
    hechas: hechas.length,
    enCurso: tareas.filter((t) => t.status === "in-progress").length,
    enRevision: tareas.filter((t) => t.status === "in-review").length,
    porHacer: tareas.filter((t) => estadoDeTarea(t.status) === "por-hacer").length,
    atrasadas: conFecha.filter((t) => new Date(t.dueDate as string).getTime() < ahora).length,
    ultimasHechas: [...hechas].sort((a, b) => b.number - a.number).slice(0, 8).map(aVista),
    enMarcha: pendientes
      .filter((t) => t.status === "in-progress" || t.status === "in-review")
      .slice(0, 8)
      .map(aVista),
    proximas: conFecha
      .filter((t) => {
        const f = new Date(t.dueDate as string).getTime();
        return f >= ahora && f <= limiteProximas;
      })
      .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime())
      .slice(0, 8)
      .map(aVista),
  };
}

// "[Growth] Dra. Ingrid Patiño" → "Dra. Ingrid Patiño": el prefijo es una
// convención interna de ASYGNUZ, el cliente no tiene por qué verla.
function limpiarNombreProyecto(nombre: string): string {
  return nombre.replace(/^\[(Growth|Software)\]\s*/, "");
}

function bloqueContenido(
  filas: { estado: string | null; fecha_publicacion: string | null }[],
  publicadasInstagramMes: number | null
): BloqueContenido {
  return {
    planeadas: filas.length,
    enProduccion: filas.filter((f) => f.estado !== "publicado").length,
    publicadasParrilla: filas.filter((f) => f.estado === "publicado").length,
    publicadasInstagramMes,
  };
}

function numero(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

async function bloquePauta(conexiones: MetaConexion[]): Promise<BloquePauta> {
  const conAnuncios = conexiones.filter((c) => c.ad_account_id);
  const bloque: BloquePauta = {
    conectado: conAnuncios.length > 0,
    moneda: null,
    gasto: 0,
    impresiones: 0,
    alcance: 0,
    clics: 0,
    resultados: 0,
    campanas: [],
    errores: [],
  };

  await Promise.all(
    conAnuncios.map(async (conexion) => {
      try {
        const [filas, moneda] = await Promise.all([
          fetchInsights(conexion),
          fetchMonedaCuentaAnuncios(conexion),
        ]);
        bloque.moneda ??= moneda;
        for (const f of filas) {
          const resultados = (f.actions ?? [])
            .filter((a) => ACCIONES_RESULTADO.has(a.action_type))
            .reduce((s, a) => s + numero(a.value), 0);
          const campana = {
            nombre: f.campaign_name,
            gasto: numero(f.spend),
            alcance: numero(f.reach),
            clics: numero(f.clicks),
            ctr: numero(f.ctr),
            resultados,
          };
          bloque.campanas.push(campana);
          bloque.gasto += campana.gasto;
          bloque.impresiones += numero(f.impressions);
          // El alcance no se puede sumar entre campañas sin duplicar personas;
          // se usa como aproximación (cota superior) y la vista lo aclara.
          bloque.alcance += campana.alcance;
          bloque.clics += campana.clics;
          bloque.resultados += resultados;
        }
      } catch {
        bloque.errores.push(`No se pudo leer la pauta de "${conexion.cliente_nombre}".`);
      }
    })
  );

  bloque.campanas.sort((a, b) => b.gasto - a.gasto);
  return bloque;
}

async function bloqueCuenta(
  conexiones: MetaConexion[]
): Promise<{ bloque: BloqueCuenta; publicadasMes: number | null }> {
  const ig = conexiones.find((c) => c.instagram_business_id && c.instagram_access_token);
  const bloque: BloqueCuenta = {
    conectado: Boolean(ig),
    usuario: null,
    seguidoresGanados: null,
    alcance30d: null,
    visitasPerfil30d: null,
    serieAlcance: [],
    errores: [],
  };
  if (!ig) return { bloque, publicadasMes: null };

  bloque.usuario = (ig as MetaConexion & { instagram_username?: string | null }).instagram_username ?? null;

  let publicadasMes: number | null = null;
  const [tendencia, media] = await Promise.allSettled([
    fetchInstagramTendenciaCuenta(ig, 30),
    fetchInstagramMedia(ig, 50),
  ]);

  if (tendencia.status === "fulfilled") {
    const t = tendencia.value;
    const suma = (serie?: { valor: number }[]) =>
      serie && serie.length > 0 ? serie.reduce((s, p) => s + p.valor, 0) : null;
    bloque.alcance30d = suma(t.reach);
    bloque.visitasPerfil30d = suma(t.profile_views);
    bloque.seguidoresGanados = suma(t.follower_count);
    bloque.serieAlcance = t.reach ?? [];
  } else {
    bloque.errores.push("No se pudo leer la evolución de la cuenta de Instagram.");
  }

  if (media.status === "fulfilled") {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    publicadasMes = media.value.filter((m) => new Date(m.timestamp) >= inicioMes).length;
  } else {
    bloque.errores.push("No se pudieron leer las publicaciones de Instagram.");
  }

  return { bloque, publicadasMes };
}
