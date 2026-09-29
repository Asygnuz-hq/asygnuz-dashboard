"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useTenantActual } from "@/lib/useTenantActual";

const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2 MB — de sobra para un logo, evita subidas gigantes

// Autoservicio de marca blanca (Kaneo #44): un admin del tenant cambia su
// nombre y logo sin tocar SQL. El candado real vive en la base
// (schema-seguridad-sprint4-marca-blanca.sql): esto solo se oculta a quien
// no es admin, RLS bloquea igual si alguien intenta el UPDATE a mano.
export function MarcaTenant() {
  const isAdmin = useIsAdmin();
  const tenant = useTenantActual();
  const [nombre, setNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setNombre(tenant.nombre);
      setLogoUrl(tenant.logoUrl);
    }
  }, [tenant]);

  if (!isAdmin || !tenant) return null;

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    let nuevoLogoUrl = logoUrl;
    if (archivo) {
      const extension = archivo.name.split(".").pop()?.toLowerCase() || "png";
      const ruta = `${tenant.id}/logo.${extension}`;
      const { error: errorSubida } = await supabase.storage
        .from("logos-tenants")
        .upload(ruta, archivo, { upsert: true, cacheControl: "300" });
      if (errorSubida) {
        setSaving(false);
        setMessage(`No se pudo subir el logo: ${errorSubida.message}`);
        return;
      }
      const { data } = supabase.storage.from("logos-tenants").getPublicUrl(ruta);
      // Cache-bust: mismo nombre de archivo siempre, así que sin esto el
      // navegador/CDN podría seguir mostrando el logo viejo tras reemplazarlo.
      nuevoLogoUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    const { error } = await supabase
      .from("tenants")
      .update({ nombre: nombre.trim(), logo_url: nuevoLogoUrl })
      .eq("id", tenant.id);

    setSaving(false);
    if (error) {
      setMessage(`No se pudo guardar: ${error.message}`);
      return;
    }
    setMessage("Guardado. Recargando para que se vea en el menú...");
    setTimeout(() => window.location.reload(), 900);
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="text-xs uppercase tracking-wide text-muted mb-3">Marca del dashboard</p>
      <form onSubmit={handleGuardar} className="flex flex-col gap-4 max-w-xs">
        <label className="flex flex-col gap-1 text-sm">
          Nombre que ven tus usuarios
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Logo (PNG o SVG, fondo transparente recomendado)
          <input
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > TAMANO_MAXIMO) {
                setMessage("El archivo pesa más de 2 MB. Usa uno más liviano.");
                e.target.value = "";
                return;
              }
              setArchivo(f);
            }}
          />
        </label>
        {(archivo || logoUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={archivo ? URL.createObjectURL(archivo) : logoUrl!}
            alt="Vista previa del logo"
            className="h-10 w-auto self-start rounded border border-border bg-surface-alt p-1"
          />
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar marca"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
    </div>
  );
}
