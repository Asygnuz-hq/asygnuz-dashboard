"use client";

import { useState, useEffect } from "react";
import type { TokenAgente } from "@/lib/bandeja/tipos";
import { formatearHoraAmigable } from "@/lib/bandeja/texto";

export function GestorTokensAgente() {
  const [tokens, setTokens] = useState<TokenAgente[]>([]);
  const [nombre, setNombre] = useState("");
  const [portales, setPortales] = useState<{ id: string; nombre: string }[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [puedeEscribir, setPuedeEscribir] = useState(false);
  const [creando, setCreando] = useState(false);
  const [tokenCreadoSecreto, setTokenCreadoSecreto] = useState<string | null>(null);
  const [tokenEsPortal, setTokenEsPortal] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recargarTrigger, setRecargarTrigger] = useState(0);

  useEffect(() => {
    let activo = true;
    async function inicializar() {
      try {
        const res = await fetch("/api/portal-admin/tokens-agente");
        if (res.ok) {
          const data = await res.json();
          if (activo) setTokens(data.tokens ?? []);
        }
      } catch (err) {
        console.error("Error cargando tokens de agente:", err);
      }
    }
    inicializar();
    return () => {
      activo = false;
    };
  }, [recargarTrigger]);

  useEffect(() => {
    fetch("/api/portal-admin/clientes")
      .then((res) => (res.ok ? res.json() : { clientes: [] }))
      .then((data) => setPortales(data.clientes ?? []))
      .catch((err) => console.error("Error cargando portales:", err));
  }, []);

  function cargarTokens() {
    setRecargarTrigger((prev) => prev + 1);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || creando) return;
    setCreando(true);
    setError(null);

    try {
      const res = await fetch("/api/portal-admin/tokens-agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), ...(tenantId ? { tenantId, puedeEscribir } : {}) }),
      });
      const data = await res.json();
      if (res.ok && data.token_secreto) {
        setTokenCreadoSecreto(data.token_secreto);
        setTokenEsPortal(Boolean(data.token?.tenant_id));
        setNombre("");
        setTenantId("");
        setPuedeEscribir(false);
        await cargarTokens();
      } else {
        setError(data.error || "Error creando token");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setCreando(false);
    }
  }

  async function handleRevocar(id: string) {
    if (!confirm("¿Seguro que deseas revocar este token? Los agentes que lo usen dejarán de tener acceso.")) {
      return;
    }
    try {
      const res = await fetch(`/api/portal-admin/tokens-agente/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await cargarTokens();
      }
    } catch (err) {
      console.error("Error revocando token:", err);
    }
  }

  function copiarAlPortapapeles() {
    if (!tokenCreadoSecreto) return;
    navigator.clipboard.writeText(tokenCreadoSecreto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  return (
    <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>🤖</span> Tokens de Acceso para Claude Code
        </h3>
        <p className="text-xs text-muted">
          Genera credenciales seguras para que Claude responda la bandeja de Instagram desde tu terminal
          siguiendo la guía de marca de cada cliente.
        </p>
      </div>

      {/* Alerta de nuevo token generado (solo se ve una vez) */}
      {tokenCreadoSecreto && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs flex flex-col gap-2">
          <p className="font-bold text-amber-200">
            ⚠️ ¡Copia tu token ahora! Por seguridad, no se volverá a mostrar:
          </p>
          <div className="flex items-center gap-2">
            <code className="p-2 rounded-lg bg-black/40 font-mono text-amber-300 flex-1 break-all select-all">
              {tokenCreadoSecreto}
            </code>
            <button
              type="button"
              onClick={copiarAlPortapapeles}
              className="px-3 py-2 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs shrink-0 hover:bg-amber-300 transition-all"
            >
              {copiado ? "¡Copiado! ✓" : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] text-amber-300/80">
            Guárdalo en tu variable de entorno:{" "}
            <code className="font-mono">export {tokenEsPortal ? "ASYGNUZ_AGENTE_TOKEN" : "ASYGNUZ_BANDEJA_TOKEN"}=&quot;...&quot;</code>
          </p>
          <button
            type="button"
            onClick={() => setTokenCreadoSecreto(null)}
            className="text-[11px] text-muted hover:text-foreground text-left mt-1 underline"
          >
            Ya lo guardé, cerrar este aviso
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}

      {/* Formulario crear token */}
      <form onSubmit={handleCrear} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del token (ej. Claude Code JM Mac)"
          className="flex-1 p-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
        />
        <select
          value={tenantId}
          onChange={(e) => {
            setTenantId(e.target.value);
            if (!e.target.value) setPuedeEscribir(false);
          }}
          aria-label="Alcance del token"
          className="p-2 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
        >
          <option value="">Bandeja (todas las cuentas)</option>
          {portales.map((p) => (
            <option key={p.id} value={p.id}>
              MCP: {p.nombre}
            </option>
          ))}
        </select>
        {tenantId && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={puedeEscribir} onChange={(e) => setPuedeEscribir(e.target.checked)} />
            Puede editar la parrilla
          </label>
        )}
        <button
          type="submit"
          disabled={!nombre.trim() || creando}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
        >
          {creando ? "Generando..." : "Generar Token 🔑"}
        </button>
      </form>

      {/* Lista de tokens */}
      <div className="flex flex-col divide-y divide-border/50 pt-2">
        {tokens.length === 0 ? (
          <p className="text-xs text-muted py-2">No hay tokens generados todavía.</p>
        ) : (
          tokens.map((t) => (
            <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  {t.nombre}
                  {t.revocado ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                      Revocado
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      Activo
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted font-mono mt-0.5">
                  {t.tenant_id
                    ? `MCP: ${portales.find((p) => p.id === t.tenant_id)?.nombre ?? "portal"} (${t.puede_escribir ? "lectura y edición" : "solo lectura"}) · `
                    : "Bandeja · "}
                  Prefijo: {t.token_prefix} · Creado: {formatearHoraAmigable(t.creado_en)}
                  {t.ultimo_uso_en ? ` · Último uso: ${formatearHoraAmigable(t.ultimo_uso_en)}` : " · Sin usar"}
                  {t.expira_en ? ` · Vence: ${new Date(t.expira_en).toLocaleDateString("es-CO")}` : ""}
                </p>
              </div>

              {!t.revocado && (
                <button
                  type="button"
                  onClick={() => handleRevocar(t.id)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-alt hover:bg-red-500/15 text-muted hover:text-red-400 border border-border transition-all shrink-0"
                >
                  Revocar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
