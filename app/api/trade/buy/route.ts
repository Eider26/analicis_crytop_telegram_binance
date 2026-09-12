import { NextRequest } from "next/server";
import { openTrade } from "../../../../lib/trades";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ============================================
    // 1. PRECIO DE ENTRADA
    // ============================================
    const entryPrice = Number(body.entryPrice);

    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return Response.json(
        {
          ok: false,
          error: "entryPrice debe ser un número mayor que 0.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 2. CAPITAL PARA LA OPERACIÓN
    // ============================================
    // Por defecto utilizaremos 8 USDT.
    // También puedes enviarlo manualmente como:
    // { "entryPrice": 101.08, "capitalUSDT": 10 }
    const capitalUSDT = Number(body.capitalUSDT ?? 8);

    if (!Number.isFinite(capitalUSDT) || capitalUSDT <= 0) {
      return Response.json(
        {
          ok: false,
          error: "capitalUSDT debe ser un número mayor que 0.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 3. CANTIDAD DE SOL
    // ============================================
    // Si enviamos quantity manualmente, la utilizamos.
    // Si no, calculamos:
    //
    // cantidad SOL = capital USDT / precio SOL
    //
    const quantityFromBody =
      body.quantity !== undefined
        ? Number(body.quantity)
        : undefined;

    const quantity =
      quantityFromBody !== undefined &&
      Number.isFinite(quantityFromBody) &&
      quantityFromBody > 0
        ? quantityFromBody
        : capitalUSDT / entryPrice;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return Response.json(
        {
          ok: false,
          error: "No se pudo calcular una cantidad válida de SOL.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 4. STOP LOSS
    // ============================================
    // Por defecto:
    // -1.2% aproximadamente
    //
    // Ejemplo:
    // 101.08 × 0.988 = 99.86704
    const stopLoss = Number(
      body.stopLoss ?? entryPrice * 0.988
    );

    if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
      return Response.json(
        {
          ok: false,
          error: "stopLoss no es válido.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 5. TAKE PROFIT
    // ============================================
    // Por defecto:
    // +2%
    //
    // Ejemplo:
    // 101.08 × 1.02 = 103.1016
    const takeProfit = Number(
      body.takeProfit ?? entryPrice * 1.02
    );

    if (!Number.isFinite(takeProfit) || takeProfit <= 0) {
      return Response.json(
        {
          ok: false,
          error: "takeProfit no es válido.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 6. SIGNAL SCORE
    // ============================================
    const signalScore =
      body.signalScore !== undefined
        ? Number(body.signalScore)
        : undefined;

    if (
      signalScore !== undefined &&
      !Number.isFinite(signalScore)
    ) {
      return Response.json(
        {
          ok: false,
          error: "signalScore no es válido.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 7. SIGNAL
    // ============================================
    const signal =
      typeof body.signal === "string"
        ? body.signal
        : undefined;

    // ============================================
    // 8. REGISTRAR OPERACIÓN
    // ============================================
    const trade = await openTrade({
      entryPrice,
      quantity,
      stopLoss,
      takeProfit,
      signalScore,
      signal,
    });

    // ============================================
    // 9. RESPUESTA
    // ============================================
    return Response.json({
      ok: true,
      message: "Compra registrada.",
      trade,
      calculation: {
        capitalUSDT,
        entryPrice,
        quantity,
        stopLoss,
        takeProfit,
      },
    });
  } catch (error) {
    console.error("Error en /api/trade/buy:", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}