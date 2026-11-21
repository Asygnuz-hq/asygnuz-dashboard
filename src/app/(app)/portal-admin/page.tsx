"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Globe } from "@phosphor-icons/react";
import { PageHeader } from "@/components/PageHeader";

type Cliente = {
  id: string;
  nombre: string;
  slug: string;
  subdominio: string | null;
  logo_url: string | null;
  color_acento: string | null;
  creado_en: string;
};

function slugificar(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PortalAdminPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [subdominio, setSubdominio] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [creando, setCreando] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function recargar() {
    const res = await fetch("/api/portal-admin/clientes");
    const data = await res.json();
    setClientes(res.ok ? data.clientes : []);
    if (!res.ok) setMessage(data.error);
  }

  useEffect(() => {
    let cancelado = false;
    fetch("/api/portal-admin/clientes")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelado) return;
        setClientes(ok ? data.clientes : []);
        if (!ok) setMessage(data.error);
      })
      .catch(() => {
        if (!cancelado) setClientes([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    setMessage(null);
    const res = await fetch("/api/portal-admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, slug, subdominio: subdominio || slug }),
    });
    const data = await res.json();
    setCreando(false);
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    setNombre("");
    setSlug("");
    setSubdominio("");
    setSlugTocado(false);
    setMessage(`Portal "${data.cliente.nombre}" creado.`);
    recargar();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Portales de Clientes (Growth)"
        subtitle="Crea portales exclusivos con subdominio propio, logo animado, parrilla y hojas tipo Excel."
      />

      <form onSubmit={handleCrear} className="flex flex-col gap-3 max-w-md glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Nuevo portal exclusivo</p>
        <label className="flex flex-col gap-1 text-sm">
          Nombre del cliente
          <input
            type="text"
            value={nombre}
            required
            maxLength={80}
            placeholder="Ej. Lumia Odontología"
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugTocado) {
                const s = slugificar(e.target.value);
                setSlug(s);
                setSubdominio(s);
              }
            }}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Slug interno
            <input
              type="text"
              value={slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTocado(true);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Subdominio
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={subdominio}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="lumia"
                onChange={(e) => setSubdominio(e.target.value.toLowerCase())}
                className="w-full"
              />
              <span className="text-xs text-muted shrink-0">.asygnuz.com</span>
            </div>
          </label>
        </div>
        <button
          type="submit"
          disabled={creando}
          className="rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60 cursor-pointer"
        >
          {creando ? "Creando..." : "Crear portal"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
        <p className="text-xs text-muted">
          Después de crearlo: sube su logo y vincula el correo del cliente desde su ficha.
        </p>
      </form>

      <section>
        <p className="text-xs uppercase tracking-wide text-muted mb-3">Portales activos</p>
        {clientes === null ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay clientes con portal.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clientes.map((c) => {
              const acento = c.color_acento || "#C9A45C";
              const sub = c.subdominio || c.slug;
              return (
                <Link
                  key={c.id}
                  href={`/portal-admin/${c.id}`}
                  className="portal-card portal-card-interactive rounded-2xl p-4 flex flex-col justify-between gap-3"
                  style={{ borderTop: `2px solid ${acento}` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.logo_url}
                          alt={c.nombre}
                          className="h-7 w-auto max-w-[96px] object-contain shrink-0"
                        />
                      ) : (
                        <span
                          className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-black"
                          style={{ backgroundColor: acento }}
                        >
                          {c.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="font-semibold text-sm truncate text-white">{c.nombre}</span>
                    </div>
                    <ArrowUpRight size={15} className="text-muted shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Globe size={13} style={{ color: acento }} />
                    <span className="truncate">{sub}.asygnuz.com</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
