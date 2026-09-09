# SOL/USDT Trading AI — Telegram + Vercel

Agente de análisis técnico para SOL/USDT. Esta versión **NO ejecuta compras ni ventas**. Analiza mercado y envía una alerta a Telegram cuando la fuerza de señal alcanza 75/100.

## 1. Instalar

```powershell
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## 2. Variables de entorno

Copia `.env.example` como `.env.local` y completa:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
```

No uses `NEXT_PUBLIC_` para secretos y no subas `.env.local` a GitHub.

## 3. Telegram

1. Abre Telegram y busca `@BotFather`.
2. Ejecuta `/newbot` y crea el bot.
3. Guarda el token en `TELEGRAM_BOT_TOKEN`.
4. Abre el bot que acabas de crear y pulsa Start / envía `/start`.
5. Con el token configurado y después de enviar `/start` al bot, usa el endpoint local `/api/telegram/updates` para obtener tu `chat.id`.

La API oficial usa `sendMessage` para enviar texto y `getUpdates` para recibir actualizaciones. Ver: https://core.telegram.org/bots/api

## 4. Obtener el CHAT_ID

Con el servidor iniciado y después de enviar `/start` al bot:

```powershell
$headers = @{ Authorization = "Bearer TU_CRON_SECRET"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/telegram/updates" -Headers $headers
```

Busca en la respuesta algo como `"id": 123456789`. Ese número va en `TELEGRAM_CHAT_ID`.

## 5. Probar Telegram localmente

Con el servidor iniciado, desde PowerShell:

```powershell
$headers = @{ Authorization = "Bearer TU_CRON_SECRET" }
Invoke-RestMethod -Uri "http://localhost:3000/api/telegram" -Headers $headers
```

Para mandar una alerta aunque el score sea menor de 75:

```powershell
$headers = @{ Authorization = "Bearer TU_CRON_SECRET"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/telegram" -Headers $headers -Body '{"force":true}'
```

## 6. Analizar sin enviar Telegram

```text
GET /api/analyze
```

El motor combina 15m, 1h y 4h, EMA20/50/200, RSI, MACD, volumen, soporte y resistencia.

## 7. Score

- 0–39: EVITAR_COMPRA
- 40–59: ESPERAR
- 60–74: VIGILAR
- 75–100: POSIBLE_COMPRA

`probabilityEstimate` es una estimación de fuerza de señal basada en el score; **no es una probabilidad estadística calibrada**.

## 8. Cron

`vercel.json` ejecuta `/api/cron` cada 15 minutos. Solo envía Telegram si el score es >= 75. Vercel Cron puede invocar funciones programadas mediante `vercel.json`; `CRON_SECRET` protege el endpoint.

## 9. Próxima fase

Añadir memoria de alertas con Supabase para evitar mensajes duplicados, backtesting y calibración de probabilidades. Solo después de validar la estrategia se considerará cualquier automatización de órdenes.
