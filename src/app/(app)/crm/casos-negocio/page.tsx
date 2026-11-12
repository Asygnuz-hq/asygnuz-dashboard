"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatCOP, formatDate } from "@/lib/format";
import { PLANTILLA } from "@/lib/casos/modelo";

type Fila = { id: string; nombre: string; cliente: string | null; precio: number; actualizado_en: string };

export default function CasosNegocioPage() {
  const router = useRouter();
  const [casos, setCasos] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [cliente, setCliente] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    createClient()
      .from("casos_negocio")
      .select("id, nombre, cliente, precio, actualizado_en")
      .order("actualizado_en", { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setCasos(data as Fila[])));
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    const { data, error } = await createClient()
      .from("casos_negocio")
      .insert({ nombre: nombre.trim(), cliente: cliente.trim() || null, precio: 0, supuestos: PLANTILLA })
      .select("id")
      .single();
    setCreando(false);
    if (error) return setError(error.message);
    router.push(`/crm/casos-negocio/${data.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Casos de negocio"
        subtitle="Cuánto cobrar por un proyecto, con qué margen y qué tan probable es perder plata. Simulación Monte Carlo de 10.000 escenarios."
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <form onSubmit={crear} className="glass rounded-2xl border p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Proyecto
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="App de agendamiento" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cliente (opcional)
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </label>
        <button disabled={creando} className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50">
          {creando ? "Creando…" : "Nuevo caso"}
        </button>
        <p className="text-xs text-muted w-full">Arranca con la plantilla del Excel (Senior + Medium + Claude Code y 5 riesgos); luego ajústala.</p>
      </form>

      {!casos && !error && <p className="text-sm text-muted">Cargando…</p>}
      {casos?.length === 0 && <p className="text-sm text-muted">Todavía no hay casos.</p>}
      {!!casos?.length && (
        <section className="glass rounded-2xl border p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="text-right px-3 py-2">Precio propuesto</th>
                <th className="text-right px-3 py-2">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {casos.map((c) => (
                <tr key={c.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <Link href={`/crm/casos-negocio/${c.id}`} className="text-accent underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c.cliente ?? "—"}</td>
                  <td className="text-right px-3 py-2">{c.precio ? formatCOP(c.precio) : "Sin definir"}</td>
                  <td className="text-right px-3 py-2">{formatDate(c.actualizado_en.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
