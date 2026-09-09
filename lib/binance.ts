const BASE = "https://api.binance.com";

export type Kline = [
  number, string, string, string, string, string,
  number, string, number, string, string, string
];

export const SYMBOL = "SOLUSDT";

export async function getKlines(interval = "15m", limit = 200): Promise<Kline[]> {
  const url = `${BASE}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);
  return res.json();
}

export async function getTicker() {
  const res = await fetch(`${BASE}/api/v3/ticker/24hr?symbol=${SYMBOL}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Binance ticker HTTP ${res.status}`);
  return res.json();
}
