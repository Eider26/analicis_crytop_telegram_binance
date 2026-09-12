
import { NextRequest } from "next/server";
import { openTrade } from "../../../../lib/trades";

const TELEGRAM_BASE = "https://api.telegram.org";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return Response.json(
      {
        ok: false,
        error: "Falta TELEGRAM_BOT_TOKEN en .env.local",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    /*
     * ============================================
     * TELEGRAM WEBHOOK
     * ============================================
     *
     * Telegram enviará algo parecido a:
     *
     * {
     *   "update_id": 123456,
     *   "message": {
     *      "chat": {
     *          "id": 123456789
     *      },
     *      "text": "COMPRÉ 101.08"
     *   }
     * }
     */

    const message =
      body.message ??
      body.edited_message ??
      body.channel_post;

    if (!message?.chat) {
      return Response.json({
        ok: true,
        message: "Update recibido sin mensaje.",
      });
    }

    const chatId = message.chat.id;

    const text =
      typeof message.text === "string"
        ? message.text.trim()
        : "";

    console.log("Telegram mensaje:", {
      chatId,
      text,
    });

    /*
     * ============================================
     * COMANDO /start
     * ============================================
     */

    if (text.toLowerCase() === "/start") {
      await sendTelegramMessage(
        token,
        chatId,
        [
          "🤖 SOL Trading AI",
          "",
          "✅ Bot conectado correctamente.",
          "",
          "Para registrar una compra escribe:",
          "",
          "COMPRÉ 101.08",
          "",
          "Ejemplo:",
          "COMPRÉ 103.50",
        ].join("\n")
      );

      return Response.json({
        ok: true,
        message: "Comando /start procesado.",
      });
    }

    /*
     * ============================================
     * COMANDO COMPRÉ
     * ============================================
     *
     * Acepta:
     *
     * COMPRÉ 101.08
     * COMPRE 101.08
     * compre 101.08
     * compré 101,08
     */

    const buyMatch = text.match(
      /^COMPR[ÉE]\s+([0-9]+(?:[.,][0-9]+)?)$/i
    );

    if (buyMatch) {
      const entryPrice = Number(
        buyMatch[1].replace(",", ".")
      );

      if (
        !Number.isFinite(entryPrice) ||
        entryPrice <= 0
      ) {
        await sendTelegramMessage(
          token,
          chatId,
          "❌ El precio indicado no es válido."
        );

        return Response.json({
          ok: false,
          error: "Precio inválido.",
        });
      }

      /*
       * ============================================
       * CAPITAL
       * ============================================
       *
       * Usaremos 8 USDT por operación.
       */

      const capitalUSDT = 8;

      /*
       * ============================================
       * CANTIDAD DE SOL
       * ============================================
       */

      const quantity =
        capitalUSDT / entryPrice;

      /*
       * ============================================
       * STOP LOSS
       * ============================================
       *
       * -1.2%
       */

      const stopLoss =
        entryPrice * 0.988;

      /*
       * ============================================
       * TAKE PROFIT
       * ============================================
       *
       * +2%
       */

      const takeProfit =
        entryPrice * 1.02;

      try {
        /*
         * ========================================
         * GUARDAR EN SUPABASE
         * ========================================
         */

        const trade = await openTrade({
          entryPrice,
          quantity,
          stopLoss,
          takeProfit,
          signal: "COMPRÉ",
        });

        console.log(
          "Operación guardada:",
          trade
        );

        /*
         * ========================================
         * RESPUESTA AL MISMO CHAT
         * ========================================
         */

        const responseText = [
          "🟢 OPERACIÓN ABIERTA",
          "",
          "🪙 SOLUSDT",
          "",
          `💵 Precio de entrada: ${entryPrice.toFixed(4)} USDT`,
          `💰 Capital: ${capitalUSDT.toFixed(2)} USDT`,
          `📦 Cantidad: ${quantity.toFixed(6)} SOL`,
          "",
          `🛑 Stop Loss: ${stopLoss.toFixed(4)} USDT`,
          `🎯 Take Profit: ${takeProfit.toFixed(4)} USDT`,
          "",
          `📊 Estado: ${trade.status}`,
          "",
          "✅ Operación guardada en Supabase.",
          "",
          `🆔 ID: ${trade.id}`,
        ].join("\n");

        await sendTelegramMessage(
          token,
          chatId,
          responseText
        );

        return Response.json({
          ok: true,
          message:
            "Operación abierta y guardada.",
          trade,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error desconocido.";

        console.error(
          "Error guardando operación:",
          error
        );

        await sendTelegramMessage(
          token,
          chatId,
          [
            "❌ NO SE PUDO ABRIR LA OPERACIÓN",
            "",
            errorMessage,
          ].join("\n")
        );

        return Response.json(
          {
            ok: false,
            error: errorMessage,
          },
          { status: 409 }
        );
      }
    }

    /*
     * ============================================
     * MENSAJE NO RECONOCIDO
     * ============================================
     */

    await sendTelegramMessage(
      token,
      chatId,
      [
        "🤖 SOL Trading AI",
        "",
        "⚠️ No reconocí esa acción.",
        "",
        "Para registrar una compra utiliza:",
        "",
        "COMPRÉ 101.08",
      ].join("\n")
    );

    return Response.json({
      ok: true,
      message: "Mensaje recibido pero no reconocido.",
    });
  } catch (error) {
    console.error(
      "Error procesando Telegram:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      { status: 500 }
    );
  }
}

/*
 * ================================================
 * ENVIAR MENSAJE A TELEGRAM
 * ================================================
 */

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string
) {
  const response = await fetch(
    `${TELEGRAM_BASE}/bot${token}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),

      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error(
      "Error enviando mensaje Telegram:",
      data
    );

    throw new Error(
      "Telegram rechazó el envío del mensaje."
    );
  }

  return data;
}
