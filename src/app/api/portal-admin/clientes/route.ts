import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";
import { crearClienteSchema } from "@/lib/portal/schemas";

// Lista los tenants de Growth (portal_cliente) — no vía RLS (un admin de
// ASYGNUZ no "pertenece" a esos tenants), sino con el cliente de servicio
// tras comprobar el rol acá mismo.
export async function GET() {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, nombre, slug, creado_en")
    .eq("modulos_habilitados->>portal_cliente", "true")
    .order("creado_en", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ clientes: data });
}

export async function POST(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, crearClienteSchema);
  if (validado instanceof Response) return validado;
  const { nombre, slug, fechaInicio, fechaFin, tipoProyecto, descripcion, contactoNombre, contactoEmail, responsableNombre, responsableEmail } = validado.data;

  const admin = createAdminClient();
  const { data: tenant, error: errorTenant } = await admin
    .from("tenants")
    .insert({ nombre, slug, modulos_habilitados: { portal_cliente: true } })
    .select("id, nombre, slug")
    .single();

  if (errorTenant) {
    const yaExiste = errorTenant.code === "23505";
    return Response.json(
      { error: yaExiste ? `Ya existe un cliente con el slug "${slug}".` : errorTenant.message },
      { status: yaExiste ? 409 : 500 }
    );
  }

  const { error: errorProyecto } = await admin.from("portal_proyecto").insert({
    tenant_id: tenant.id,
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
    tipo_proyecto: tipoProyecto || null,
    descripcion: descripcion || null,
    contacto_nombre: contactoNombre || null,
    contacto_email: contactoEmail || null,
    responsable_nombre: responsableNombre || null,
    responsable_email: responsableEmail || null,
  });

  if (errorProyecto) {
    // El tenant ya quedó creado — no se revierte (igual pasa con crear_tenant
    // a mano): mejor un portal con la ficha vacía por completar que perder
    // el tenant recién creado por un error de red a mitad de camino.
    return Response.json(
      { error: `Cliente creado, pero falló guardar la ficha del proyecto: ${errorProyecto.message}` },
      { status: 500 }
    );
  }

  return Response.json({ cliente: tenant });
}
