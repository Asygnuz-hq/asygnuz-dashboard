"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Result = { id: string; label: string; sub: string; href: string };

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const [{ data: clientes }, { data: cuentas }] = await Promise.all([
        supabase.from("clientes").select("id, nombre, estado").ilike("nombre", `%${query}%`).is("eliminado_en", null).limit(5),
        supabase.from("cuentas").select("id, nombre, moneda").ilike("nombre", `%${query}%`).is("eliminado_en", null).limit(5),
      ]);
      setResults([
        ...(clientes ?? []).map((c) => ({
          id: c.id,
          label: c.nombre,
          sub: `Cliente · ${c.estado}`,
          href: `/clientes/${c.id}`,
        })),
        ...(cuentas ?? []).map((c) => ({
          id: c.id,
          label: c.nombre,
          sub: `Cuenta · ${c.moneda}`,
          href: `/cuentas/${c.id}`,
        })),
      ]);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente o cuenta... (⌘K)"
        className="w-full"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.href}
              onMouseDown={() => go(r.href)}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-alt"
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-muted">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
