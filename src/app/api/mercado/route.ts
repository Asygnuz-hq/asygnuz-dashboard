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

async function fetchCoingecko(ids: string[]): Promise<Record<string, PriceResult>> {
  const results: Record<string, PriceResult> = {};
  if (ids.length === 0) return results;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );
    const data = await res.json();
    for (const id of ids) {
      const entry = data?.[id];
      results[id] = entry
        ? { price: entry.usd ?? null, changePct: typeof entry.usd_24h_change === "number" ? entry.usd_24h_change / 100 : null }
        : { price: null, changePct: null };
    }
  } catch {
    for (const id of ids) results[id] = { price: null, changePct: null };
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yahooSymbols = (searchParams.get("yahoo") ?? "").split(",").filter(Boolean);
  const coingeckoIds = (searchParams.get("coingecko") ?? "").split(",").filter(Boolean);

  const [yahooResults, coingeckoResults] = await Promise.all([
    Promise.all(yahooSymbols.map((s) => fetchYahoo(s))),
    fetchCoingecko(coingeckoIds),
  ]);

  const results: Record<string, PriceResult> = { ...coingeckoResults };
  yahooSymbols.forEach((symbol, i) => {
    results[symbol] = yahooResults[i];
  });

  return Response.json(results);
}
