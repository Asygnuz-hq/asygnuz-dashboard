"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatPercent } from "@/lib/format";

type Preset = {
  simbolo: string;
  nombre: string;
  categoria: "Cripto" | "Acción" | "ETF / Fondo" | "Metal" | "Divisa";
  fuente: "yahoo" | "coinbase";
  query_id: string;
};

const PRESETS: Preset[] = [
  { simbolo: "BTC", nombre: "Bitcoin", categoria: "Cripto", fuente: "coinbase", query_id: "BTC" },
  { simbolo: "ETH", nombre: "Ethereum", categoria: "Cripto", fuente: "coinbase", query_id: "ETH" },
  { simbolo: "BNB", nombre: "BNB", categoria: "Cripto", fuente: "coinbase", query_id: "BNB" },
  { simbolo: "SOL", nombre: "Solana", categoria: "Cripto", fuente: "coinbase", query_id: "SOL" },
  { simbolo: "XRP", nombre: "XRP", categoria: "Cripto", fuente: "coinbase", query_id: "XRP" },
  { simbolo: "AAPL", nombre: "Apple", categoria: "Acción", fuente: "yahoo", query_id: "AAPL" },
  { simbolo: "MSFT", nombre: "Microsoft", categoria: "Acción", fuente: "yahoo", query_id: "MSFT" },
  { simbolo: "GOOGL", nombre: "Alphabet (Google)", categoria: "Acción", fuente: "yahoo", query_id: "GOOGL" },
  { simbolo: "AMZN", nombre: "Amazon", categoria: "Acción", fuente: "yahoo", query_id: "AMZN" },
  { simbolo: "NVDA", nombre: "Nvidia", categoria: "Acción", fuente: "yahoo", query_id: "NVDA" },
  { simbolo: "TSLA", nombre: "Tesla", categoria: "Acción", fuente: "yahoo", query_id: "TSLA" },
  { simbolo: "SPY", nombre: "S&P 500 (SPY)", categoria: "ETF / Fondo", fuente: "yahoo", query_id: "SPY" },
  { simbolo: "QQQ", nombre: "Nasdaq 100 (QQQ)", categoria: "ETF / Fondo", fuente: "yahoo", query_id: "QQQ" },
  { simbolo: "VOO", nombre: "Vanguard S&P 500 (VOO)", categoria: "ETF / Fondo", fuente: "yahoo", query_id: "VOO" },
  { simbolo: "VTI", nombre: "Vanguard Total Market (VTI)", categoria: "ETF / Fondo", fuente: "yahoo", query_id: "VTI" },
  { simbolo: "XAU", nombre: "Oro", categoria: "Metal", fuente: "yahoo", query_id: "GC=F" },
  { simbolo: "EURUSD", nombre: "EUR / USD", categoria: "Divisa", fuente: "yahoo", query_id: "EURUSD=X" },
];

type WatchItem = { id: string; simbolo: string; nombre: string; categoria: string; fuente: string; query_id: string };
type Price = { price: number | null; changePct: number | null };

export default function MercadoPage() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const loadWatchlist = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("mercado_watchlist").select("*").order("categoria", { ascending: true });
    setWatchlist((data as WatchItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWatchlist();
  }, [loadWatchlist]);

  const refreshPrices = useCallback(async (items: WatchItem[]) => {
    if (items.length === 0) {
      setPrices({});
      return;
    }
    setLoadingPrices(true);
    const yahoo = items.filter((i) => i.fuente === "yahoo").map((i) => i.query_id);
    const coinbase = items.filter((i) => i.fuente === "coinbase").map((i) => i.query_id);
    const params = new URLSearchParams();
    if (yahoo.length) params.set("yahoo", yahoo.join(","));
    if (coinbase.length) params.set("coinbase", coinbase.join(","));
    try {
      const res = await fetch(`/api/mercado?${params.toString()}`);
      const data = await res.json();
      setPrices(data);
    } catch {
      // keep previous prices on failure
    }
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    // refreshPrices is an async fetch; its setState calls happen after an
    // await, not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (watchlist.length > 0) refreshPrices(watchlist);
  }, [watchlist, refreshPrices]);

  async function addPreset(preset: Preset) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("mercado_watchlist").insert({ ...preset, created_by: user?.id ?? null });
    if (!error) loadWatchlist();
  }

  async function removeItem(id: string) {
    const supabase = createClient();
    await supabase.from("mercado_watchlist").delete().eq("id", id);
    loadWatchlist();
  }

  const availablePresets = useMemo(
    () => PRESETS.filter((p) => !watchlist.some((w) => w.simbolo === p.simbolo)),
    [watchlist]
  );

  const categorias: Preset["categoria"][] = ["Cripto", "Acción", "ETF / Fondo", "Metal", "Divisa"];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Watchlist de Mercado"
        subtitle="Precios en vivo de referencia. Esto es información de mercado, no una recomendación de inversión — la decisión es tuya."
      />

      {!loading && watchlist.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Tu watchlist</h2>
            <button
              onClick={() => refreshPrices(watchlist)}
              disabled={loadingPrices}
              className="rounded-md border border-border bg-surface-alt text-sm px-3 py-1.5 text-muted hover:text-foreground disabled:opacity-60"
            >
              {loadingPrices ? "Actualizando..." : "Actualizar precios"}
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Símbolo</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2 text-right">Precio (USD)</th>
                  <th className="px-3 py-2 text-right">Cambio</th>
                  <th className="px-3 py-2 text-right">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((w) => {
                  const p = prices[w.query_id];
                  const change = p?.changePct;
                  return (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{w.simbolo}</td>
                      <td className="px-3 py-2">{w.nombre}</td>
                      <td className="px-3 py-2 text-muted">{w.categoria}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p?.price != null ? p.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "-"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          change == null ? "text-muted" : change >= 0 ? "text-accent-bright" : "text-danger"
                        }`}
                      >
                        {change != null ? `${change >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(change))}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(w.id)} className="text-danger text-sm">
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Agregar a tu watchlist</h2>
        {categorias.map((cat) => {
          const items = availablePresets.filter((p) => p.categoria === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <p className="text-xs uppercase tracking-wide text-muted mb-2">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((p) => (
                  <button
                    key={p.simbolo}
                    onClick={() => addPreset(p)}
                    className="rounded-md border border-border bg-surface-alt text-sm px-3 py-1.5 hover:border-accent"
                  >
                    + {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {availablePresets.length === 0 && (
          <p className="text-sm text-muted">Ya agregaste todos los activos disponibles en la lista curada.</p>
        )}
      </div>
    </div>
  );
}
