"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", { cache: "no-store" });
      setResult(await res.json());
    } finally { setLoading(false); }
  }

  const a = result?.analysis;
  return (
    <main style={{fontFamily:"Arial", maxWidth:900, margin:"0 auto", padding:32}}>
      <h1>🤖 SOL/USDT Trading AI</h1>
      <p>Agente de análisis técnico con alertas por Telegram.</p>
      <button onClick={analyze} disabled={loading} style={{padding:"12px 18px", cursor:"pointer"}}>
        {loading ? "Analizando..." : "Analizar SOL/USDT ahora"}
      </button>
      {a && <section style={{marginTop:24, padding:20, border:"1px solid #ddd", borderRadius:12}}>
        <h2>{a.signal}</h2>
        <p><strong>Precio:</strong> {a.price.toFixed(3)} USDT</p>
        <p><strong>Fuerza de señal:</strong> {a.score}/100</p>
        <p><strong>Estimación orientativa:</strong> {a.probabilityEstimate}%</p>
        <p><strong>RSI 15m:</strong> {a.timeframes.m15.rsi14?.toFixed(2)}</p>
        <p><strong>EMA20:</strong> {a.timeframes.m15.ema20?.toFixed(3)}</p>
        <p><strong>EMA50:</strong> {a.timeframes.m15.ema50?.toFixed(3)}</p>
        <p><strong>MACD:</strong> {a.timeframes.m15.macd?.histogram >= 0 ? "Positivo" : "Negativo"}</p>
        <h3>Confirmaciones</h3>
        <ul>{a.reasons.map((r:string, i:number) => <li key={i}>{r}</li>)}</ul>
        <small>{a.disclaimer}</small>
      </section>}
      <hr style={{margin:"32px 0"}} />
      <p><code>/api/market</code> — datos públicos de Binance</p>
      <p><code>/api/analyze</code> — análisis multi-temporal</p>
      <p><code>/api/telegram</code> — prueba/configuración de Telegram</p>
      <p><code>/api/cron</code> — análisis automático programado</p>
      <p><code>/api/health</code> — estado de configuración</p>
      <p><strong>Seguridad:</strong> esta versión no ejecuta compras ni ventas automáticamente.</p>
    </main>
  );
}
