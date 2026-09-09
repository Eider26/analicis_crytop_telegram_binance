const TELEGRAM_BASE = "https://api.telegram.org";

export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Faltan TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID");

  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(`Telegram HTTP ${res.status}: ${data.description ?? "error desconocido"}`);
  return data;
}

export async function getTelegramMe() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/getMe`, { cache: "no-store" });
  return res.json();
}

export function buildTelegramAlert(a: any) {
  const t = a.timeframes;
  const emoji = a.signal === "POSIBLE_COMPRA" ? "🟢" : a.signal === "VIGILAR" ? "🟡" : a.signal === "EVITAR_COMPRA" ? "🔴" : "⚪";
  return [
    `🤖 SOL TRADING AI`,
    `${emoji} ${a.signal}`,
    `💰 Precio: ${a.price.toFixed(3)} USDT`,
    `📊 Fuerza de señal: ${a.score}/100`,
    `📈 Estimación orientativa: ${a.probabilityEstimate}%`,
    `⏱ 15m / 1h / 4h`,
    "",
    `RSI 15m: ${t.m15.rsi14?.toFixed(2) ?? "N/D"}`,
    `EMA20 15m: ${t.m15.ema20?.toFixed(3) ?? "N/D"}`,
    `EMA50 15m: ${t.m15.ema50?.toFixed(3) ?? "N/D"}`,
    `MACD 15m: ${t.m15.macd ? (t.m15.macd.histogram >= 0 ? "🟢 positivo" : "🔴 negativo") : "N/D"}`,
    `Volumen/Media: ${t.m15.volumeRatio ? `${t.m15.volumeRatio.toFixed(2)}x` : "N/D"}`,
    `Soporte 15m: ${t.m15.support40?.toFixed(3) ?? "N/D"}`,
    `Resistencia 15m: ${t.m15.resistance40?.toFixed(3) ?? "N/D"}`,
    "",
    "🧠 Confirmaciones:",
    ...a.reasons.slice(0, 8).map((r: string) => `• ${r}`),
    "",
    `24h: ${a.change24h.toFixed(2)}%`,
    "⚠️ No es una orden automática. La estimación no está calibrada como probabilidad estadística y no garantiza ganancias."
  ].join("\n");
}
