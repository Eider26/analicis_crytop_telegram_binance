import { getKlines, getTicker } from "../../../lib/binance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ticker, klines] = await Promise.all([getTicker(), getKlines("15m", 200)]);
    return Response.json({ ok: true, symbol: "SOLUSDT", ticker, last20Candles: klines.slice(-20) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error de mercado" }, { status: 500 });
  }
}
