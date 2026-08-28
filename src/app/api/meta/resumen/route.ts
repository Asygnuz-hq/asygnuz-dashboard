import { createClient } from "@/lib/supabase/server";
import { fetchInsights, fetchInstagramMedia, fetchMonedaCuentaAnuncios, type MetaConexion } from "@/lib/meta/client";

export type ResumenCliente = {
  id: string;
  cliente_nombre: string;
  tieneAnuncios: boolean;
  tieneInstagram: boolean;
  monedaAnuncios: string;
  gastoAnuncios: number;
  alcanceAnuncios: number;
  alcanceInstagram: number;
  interaccionesInstagram: number;
  tasaInteraccionPromedio: number | null;
  publicaciones: number;
  error: string | null;
};

// Trae un resumen de cada cliente conectado (anuncios + Instagram) para
// compararlos en un ranking. Corre las consultas a Meta en paralelo — con
// pocos clientes es rápido, pero si hay muchos puede tardar unos segundos
// porque cada uno implica varias llamadas a la Graph API.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: conexiones, error } = await supabase
    .from("meta_conexiones")
    .select("*")
    .order("cliente_nombre");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const resumenes: ResumenCliente[] = await Promise.all(
    (conexiones as MetaConexion[]).map(async (c) => {
      const base: ResumenCliente = {
        id: c.id,
        cliente_nombre: c.cliente_nombre,
        tieneAnuncios: Boolean(c.ad_account_id),
        tieneInstagram: Boolean(c.instagram_business_id && c.instagram_access_token),
        monedaAnuncios: "USD",
        gastoAnuncios: 0,
        alcanceAnuncios: 0,
        alcanceInstagram: 0,
        interaccionesInstagram: 0,
        tasaInteraccionPromedio: null,
        publicaciones: 0,
        error: null,
      };

      try {
        if (base.tieneAnuncios) {
          const [insights, moneda] = await Promise.all([fetchInsights(c), fetchMonedaCuentaAnuncios(c)]);
          base.gastoAnuncios = insights.reduce((acc, r) => acc + Number(r.spend), 0);
          base.alcanceAnuncios = insights.reduce((acc, r) => acc + Number(r.reach), 0);
          base.monedaAnuncios = moneda;
        }
        if (base.tieneInstagram) {
          const media = await fetchInstagramMedia(c);
          base.publicaciones = media.length;
          base.alcanceInstagram = media.reduce((acc, m) => acc + (m.metricas.reach ?? 0), 0);
          base.interaccionesInstagram = media.reduce(
            (acc, m) =>
              acc + (m.metricas.likes ?? 0) + (m.metricas.comments ?? 0) + (m.metricas.shares ?? 0) + (m.metricas.saved ?? 0),
            0
          );
          const tasasPorPost = media
            .map((m) => {
              const alcance = m.metricas.reach;
              if (!alcance) return null;
              const inter = (m.metricas.likes ?? 0) + (m.metricas.comments ?? 0) + (m.metricas.shares ?? 0) + (m.metricas.saved ?? 0);
              return (inter / alcance) * 100;
            })
            .filter((t): t is number => t !== null);
          base.tasaInteraccionPromedio = tasasPorPost.length
            ? tasasPorPost.reduce((a, b) => a + b, 0) / tasasPorPost.length
            : null;
        }
      } catch (err) {
        base.error = err instanceof Error ? err.message : "Error desconocido";
      }

      return base;
    })
  );

  return Response.json({ resumenes });
}
