import { getKlines, getTicker } from "../../../lib/binance";
import { analyzeMultiTimeframe } from "../../../lib/analysis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ticker, klines15m, klines1h, klines4h] = await Promise.all([
      getTicker(), getKlines("15m", 250), getKlines("1h", 250), getKlines("4h", 250)
    ]);
    const analysis = analyzeMultiTimeframe({ klines15m, klines1h, klines4h, ticker });
    return Response.json({ ok: true, analysis, generatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error de análisis" }, { status: 500 });
  }
}
