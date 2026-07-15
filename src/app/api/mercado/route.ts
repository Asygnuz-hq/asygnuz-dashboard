type PriceResult = { price: number | null; changePct: number | null };

async function fetchYahoo(symbol: string): Promise<PriceResult> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return { price: null, changePct: null };
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    return {
      price,
      changePct: typeof prevClose === "number" && prevClose !== 0 ? (price - prevClose) / prevClose : null,
    };
  } catch {
    return { price: null, changePct: null };
  }
}

// CoinGecko and Binance both block or rate-limit requests from US-based
// cloud/serverless IPs (Vercel's functions run in us-east-1). Coinbase is a
// US-regulated exchange, so its public API works reliably from there.
async function fetchCoinbase(symbol: string): Promise<PriceResult> {
  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}-USD/stats`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const data = await res.json();
    const price = Number(data?.last);
    const open = Number(data?.open);
    return {
      price: Number.isFinite(price) ? price : null,
      changePct: Number.isFinite(price) && Number.isFinite(open) && open !== 0 ? (price - open) / open : null,
    };
  } catch {
    return { price: null, changePct: null };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yahooSymbols = (searchParams.get("yahoo") ?? "").split(",").filter(Boolean);
  const coinbaseSymbols = (searchParams.get("coinbase") ?? "").split(",").filter(Boolean);

  const [yahooResults, coinbaseResults] = await Promise.all([
    Promise.all(yahooSymbols.map((s) => fetchYahoo(s))),
    Promise.all(coinbaseSymbols.map((s) => fetchCoinbase(s))),
  ]);

  const results: Record<string, PriceResult> = {};
  yahooSymbols.forEach((symbol, i) => {
    results[symbol] = yahooResults[i];
  });
  coinbaseSymbols.forEach((symbol, i) => {
    results[symbol] = coinbaseResults[i];
  });

  return Response.json(results);
}
