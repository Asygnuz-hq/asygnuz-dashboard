"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

type Cliente = { id: string; nombre: string; slug: string; creado_en: string };

function slugificar(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PortalAdminPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [creando, setCreando] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/portal-admin/clientes");
    const data = await res.json();
    setClientes(res.ok ? data.clientes : []);
    if (!res.ok) setMessage(data.error);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    setMessage(null);
    const res = await fetch("/api/portal-admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, slug }),
    });
    const data = await res.json();
    setCreando(false);
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    setNombre("");
    setSlug("");
    setSlugTocado(false);
    setMessage(`Cliente "${data.cliente.nombre}" creado.`);
    cargar();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Portales de Clientes (Growth)"
        subtitle="Crea el portal de un cliente y gestiona su parrilla de contenido, enlaces, reuniones y archivos."
      />

      <form onSubmit={handleCrear} className="flex flex-col gap-3 max-w-sm rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Nuevo cliente</p>
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            type="text"
            value={nombre}
            required
            maxLength={80}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugTocado) setSlug(slugificar(e.target.value));
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Slug (identificador único)
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
        <button
          type="submit"
          disabled={creando}
          className="rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60"
        >
          {creando ? "Creando..." : "Crear portal"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
        <p className="text-xs text-muted">
          Después de crearlo: crea el usuario del cliente en Supabase (Authentication → Users → Add user) y
          vincúlalo desde la ficha del cliente.
        </p>
      </form>

      <section>
        <p className="text-xs uppercase tracking-wide text-muted mb-3">Clientes</p>
        {clientes === null ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay clientes con portal.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {clientes.map((c) => (
              <Link
                key={c.id}
                href={`/portal-admin/${c.id}`}
                className="rounded-md border border-border bg-surface p-3 text-sm hover:bg-surface-alt"
              >
                <span className="font-medium">{c.nombre}</span>{" "}
                <span className="text-muted">({c.slug})</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
