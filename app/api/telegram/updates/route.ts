import { NextRequest } from "next/server";
import { openTrade, getOpenTrade } from "../../../../lib/trades";

const TELEGRAM_BASE = "https://api.telegram.org";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("Falta TELEGRAM_BOT_TOKEN");

    // Importante:
    // Respondemos 200 para evitar reintentos infinitos de Telegram.
    return Response.json({
      ok: true,
      processed: false,
      error: "Falta TELEGRAM_BOT_TOKEN",
    });
  }

  try {
    const body = await req.json();

    const message =
      body.message ??
      body.edited_message ??
      body.channel_post;

    if (!message?.chat) {
      return Response.json({
        ok: true,
        processed: true,
        message: "Update recibido sin mensaje.",
      });
    }

    const chatId = message.chat.id;

    const text =
      typeof message.text === "string"
        ? message.text.trim()
        : "";

    console.log("Telegram mensaje recibido:", {
      updateId: body.update_id,
      chatId,
      text,
    });

    /*
     * ============================================
     * /start
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
          "Comandos disponibles:",
          "",
          "COMPRÉ 101.08",
          "VENDÍ 103.50",
          "",
          "Ejemplo:",
          "COMPRÉ 103.50",
        ].join("\n")
      );

      return Response.json({
        ok: true,
        processed: true,
        message: "/start procesado.",
      });
    }

    /*
     * ============================================
     * COMANDO COMPRÉ
     * ============================================
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
          ok: true,
          processed: true,
          error: "Precio inválido.",
        });
      }

      /*
       * ========================================
       * VERIFICAR OPERACIÓN ABIERTA
       * ========================================
       */

      try {
        const existingTrade = await getOpenTrade();

        if (existingTrade) {
          await sendTelegramMessage(
            token,
            chatId,
            [
              "⚠️ YA EXISTE UNA OPERACIÓN ABIERTA",
              "",
              "🪙 SOLUSDT",
              "",
              `💵 Entrada: ${Number(
                existingTrade.entry_price
              ).toFixed(4)} USDT`,
              `📦 Cantidad: ${
                existingTrade.quantity
                  ? Number(
                      existingTrade.quantity
                    ).toFixed(6)
                  : "No registrada"
              } SOL`,
              "",
              `🛑 Stop Loss: ${Number(
                existingTrade.stop_loss
              ).toFixed(4)} USDT`,
              `🎯 Take Profit: ${Number(
                existingTrade.take_profit
              ).toFixed(4)} USDT`,
              "",
              "❌ No se abrió otra operación.",
              "",
              "Primero cierra la operación actual.",
            ].join("\n")
          );

          // IMPORTANTE:
          // Respondemos 200, no 409.
          // Así Telegram no vuelve a enviar el mismo update.
          return Response.json({
            ok: true,
            processed: true,
            operationOpened: false,
            reason: "OPEN_TRADE_EXISTS",
            tradeId: existingTrade.id,
          });
        }
      } catch (error) {
        console.error(
          "Error consultando operación abierta:",
          error
        );

        await sendTelegramMessage(
          token,
          chatId,
          [
            "❌ ERROR CONSULTANDO OPERACIÓN",
            "",
            error instanceof Error
              ? error.message
              : "Error desconocido.",
          ].join("\n")
        );

        return Response.json({
          ok: true,
          processed: true,
          operationOpened: false,
          error:
            error instanceof Error
              ? error.message
              : "Error desconocido.",
        });
      }

      /*
       * ========================================
       * CAPITAL
       * ========================================
       */

      const capitalUSDT = 8;

      /*
       * ========================================
       * CANTIDAD SOL
       * ========================================
       */

      const quantity =
        capitalUSDT / entryPrice;

      /*
       * ========================================
       * STOP LOSS -1.2%
       * ========================================
       */

      const stopLoss =
        entryPrice * 0.988;

      /*
       * ========================================
       * TAKE PROFIT +2%
       * ========================================
       */

      const takeProfit =
        entryPrice * 1.02;

      /*
       * ========================================
       * CREAR OPERACIÓN
       * ========================================
       */

      try {
        const trade = await openTrade({
          entryPrice,
          quantity,
          stopLoss,
          takeProfit,
          signal: "COMPRÉ",
        });

        console.log(
          "Operación guardada correctamente:",
          trade
        );

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
          processed: true,
          operationOpened: true,
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

        /*
         * MUY IMPORTANTE:
         *
         * No devolvemos 409.
         * Devolvemos 200 para evitar que Telegram
         * reintente indefinidamente el mismo mensaje.
         */

        return Response.json({
          ok: true,
          processed: true,
          operationOpened: false,
          error: errorMessage,
        });
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
        "Para registrar una compra:",
        "",
        "COMPRÉ 101.08",
      ].join("\n")
    );

    return Response.json({
      ok: true,
      processed: true,
      message: "Mensaje recibido pero no reconocido.",
    });
  } catch (error) {
    console.error(
      "Error procesando Telegram:",
      error
    );

    /*
     * Respondemos 200 para evitar reintentos
     * infinitos de Telegram.
     */

    return Response.json({
      ok: true,
      processed: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido.",
    });
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
