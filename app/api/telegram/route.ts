import { getKlines, getTicker } from "../../../lib/binance";
import { analyzeMultiTimeframe } from "../../../lib/analysis";
import { buildTelegramAlert, getTelegramMe, sendTelegramMessage } from "../../../lib/telegram";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  try {
    const me = await getTelegramMe();
    return Response.json({ ok: !!me.ok, telegram: me });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Telegram no configurado" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  try {
    const [ticker, klines15m, klines1h, klines4h] = await Promise.all([
      getTicker(), getKlines("15m", 250), getKlines("1h", 250), getKlines("4h", 250)
    ]);
    const analysis = analyzeMultiTimeframe({ klines15m, klines1h, klines4h, ticker });
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    if (analysis.score < 75 && !force) {
      return Response.json({ ok: true, sent: false, reason: "La señal no alcanzó 75/100", analysis });
    }
    const telegram = await sendTelegramMessage(buildTelegramAlert(analysis));
    return Response.json({ ok: true, sent: true, analysis, telegram });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error enviando Telegram" }, { status: 500 });
  }
}
