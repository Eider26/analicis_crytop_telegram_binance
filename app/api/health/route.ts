export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "SOL Trading AI",
    symbol: "SOLUSDT",
    configured: {
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      cron: Boolean(process.env.CRON_SECRET),
      binancePrivateApi: Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET)
    },
    tradingEnabled: false,
    note: "El proyecto solo analiza y alerta; no ejecuta órdenes en Binance."
  });
}
