import { getKlines, getTicker } from "../../../lib/binance";
import { analyzeMultiTimeframe } from "../../../lib/analysis";
import { buildTelegramAlert, sendTelegramMessage } from "../../../lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const [ticker, klines15m, klines1h, klines4h] = await Promise.all([
      getTicker(), getKlines("15m", 250), getKlines("1h", 250), getKlines("4h", 250)
    ]);
    const analysis = analyzeMultiTimeframe({ klines15m, klines1h, klines4h, ticker });
    if (analysis.score < 75) {
      return Response.json({ ok: true, sent: false, score: analysis.score, signal: analysis.signal });
    }
    await sendTelegramMessage(buildTelegramAlert(analysis));
    return Response.json({ ok: true, sent: true, score: analysis.score, signal: analysis.signal });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error del cron" }, { status: 500 });
  }
}
