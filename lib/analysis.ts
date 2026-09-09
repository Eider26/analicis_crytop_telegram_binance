import type { Kline } from "./binance";

function closes(klines: Kline[]) { return klines.map(k => Number(k[4])); }
function highs(klines: Kline[]) { return klines.map(k => Number(k[2])); }
function lows(klines: Kline[]) { return klines.map(k => Number(k[3])); }
function volumes(klines: Kline[]) { return klines.map(k => Number(k[5])); }

export function sma(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) result = values[i] * k + result * (1 - k);
  return result;
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff; else loss += Math.abs(diff);
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  if (values.length < slow + signalPeriod) return null;
  const kFast = 2 / (fast + 1);
  const kSlow = 2 / (slow + 1);
  let fastEma = values.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
  let slowEma = values.slice(0, slow).reduce((a, b) => a + b, 0) / slow;
  const macdSeries: number[] = [];

  for (let i = fast; i < slow; i++) fastEma = values[i] * kFast + fastEma * (1 - kFast);
  for (let i = slow; i < values.length; i++) {
    fastEma = values[i] * kFast + fastEma * (1 - kFast);
    slowEma = values[i] * kSlow + slowEma * (1 - kSlow);
    macdSeries.push(fastEma - slowEma);
  }
  if (macdSeries.length < signalPeriod) return null;
  let signal = macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdSeries.length; i++) signal = macdSeries[i] * (2 / (signalPeriod + 1)) + signal * (1 - 2 / (signalPeriod + 1));
  const line = macdSeries.at(-1)!;
  return { line, signal, histogram: line - signal };
}

export function atr(klines: Kline[], period = 14) {
  if (klines.length <= period) return null;
  const h = highs(klines), l = lows(klines), c = closes(klines);
  const tr: number[] = [];
  for (let i = 1; i < klines.length; i++) tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  if (tr.length < period) return null;
  return tr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function timeframeAnalysis(klines: Kline[], price: number) {
  const c = closes(klines);
  const ema20 = ema(c, 20);
  const ema50 = ema(c, 50);
  const ema200 = ema(c, 200);
  const rsi14 = rsi(c, 14);
  const m = macd(c);
  const a = atr(klines);
  const recent = c.slice(-40);
  const support = Math.min(...recent);
  const resistance = Math.max(...recent);
  const vol = volumes(klines);
  const avgVol20 = sma(vol, 20);
  const currentVol = vol.at(-1) ?? 0;
  return {
    price, ema20, ema50, ema200, rsi14, macd: m, atr14: a,
    support40: support, resistance40: resistance,
    volume: currentVol, averageVolume20: avgVol20,
    volumeRatio: avgVol20 ? currentVol / avgVol20 : null
  };
}

export function analyzeMultiTimeframe(data: {
  klines15m: Kline[]; klines1h: Kline[]; klines4h: Kline[]; ticker: any;
}) {
  const price = Number(data.ticker.lastPrice);
  const t15 = timeframeAnalysis(data.klines15m, price);
  const t1h = timeframeAnalysis(data.klines1h, price);
  const t4h = timeframeAnalysis(data.klines4h, price);
  let score = 50;
  const reasons: string[] = [];

  const add = (points: number, reason: string) => { score += points; if (points !== 0) reasons.push(`${points > 0 ? "✓" : "✗"} ${reason}`); };

  if (t15.ema20 && price > t15.ema20) add(8, "precio sobre EMA20 en 15m"); else add(-8, "precio bajo EMA20 en 15m");
  if (t15.ema50 && price > t15.ema50) add(7, "precio sobre EMA50 en 15m"); else add(-7, "precio bajo EMA50 en 15m");
  if (t1h.ema50 && price > t1h.ema50) add(10, "tendencia 1h favorable"); else add(-10, "tendencia 1h débil");
  if (t4h.ema50 && price > t4h.ema50) add(8, "tendencia 4h favorable"); else add(-8, "tendencia 4h débil");

  if (t15.rsi14 !== null) {
    if (t15.rsi14 >= 45 && t15.rsi14 <= 65) add(10, "RSI 15m en zona saludable");
    else if (t15.rsi14 > 70) add(-10, "RSI 15m en sobrecompra");
    else if (t15.rsi14 < 35) add(-5, "RSI 15m muy bajo; rebote no confirmado");
  }
  if (t15.macd) add(t15.macd.histogram > 0 ? 8 : -8, t15.macd.histogram > 0 ? "MACD 15m positivo" : "MACD 15m negativo");
  if (t1h.macd) add(t1h.macd.histogram > 0 ? 7 : -7, t1h.macd.histogram > 0 ? "MACD 1h positivo" : "MACD 1h negativo");
  if (t15.volumeRatio !== null) add(t15.volumeRatio >= 1.15 ? 7 : 0, t15.volumeRatio >= 1.15 ? "volumen 15m por encima de su media" : "volumen sin confirmación fuerte");

  const nearSupport = t15.support40 > 0 && Math.abs(price - t15.support40) / price <= 0.02;
  const nearResistance = t15.resistance40 > 0 && Math.abs(t15.resistance40 - price) / price <= 0.01;
  if (nearSupport) add(8, "precio cerca de soporte reciente");
  if (nearResistance) add(-8, "precio cerca de resistencia reciente");

  score = Math.max(0, Math.min(100, Math.round(score)));
  let signal = "ESPERAR";
  if (score >= 75) signal = "POSIBLE_COMPRA";
  else if (score >= 60) signal = "VIGILAR";
  else if (score < 40) signal = "EVITAR_COMPRA";

  const probabilityEstimate = score;
  const change24h = Number(data.ticker.priceChangePercent);
  return {
    symbol: "SOLUSDT", price, change24h, score, probabilityEstimate, signal,
    timeframes: { m15: t15, h1: t1h, h4: t4h }, reasons,
    disclaimer: "La probabilidad es una estimación de fuerza de señal, no una probabilidad estadística calibrada ni una garantía de ganancia."
  };
}

export function formatPrice(n: number | null) { return n == null ? "N/D" : n.toFixed(3); }
