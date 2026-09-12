import { NextRequest } from "next/server";
import { getTicker } from "../../../../lib/binance";
import {
  closeTrade,
  getOpenTrade,
} from "../../../../lib/trades";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const trade = await getOpenTrade();

    if (!trade) {
      return Response.json(
        {
          ok: false,
          error: "No existe una operación abierta.",
        },
        { status: 404 }
      );
    }

    let exitPrice: number;

    if (body.exitPrice !== undefined) {
      exitPrice = Number(body.exitPrice);
    } else {
      const ticker = await getTicker();
      exitPrice = Number(ticker.price);
    }

    if (!Number.isFinite(exitPrice)) {
      return Response.json(
        {
          ok: false,
          error: "Precio de venta inválido.",
        },
        { status: 400 }
      );
    }

    const closedTrade = await closeTrade(
      trade.id,
      exitPrice
    );

    return Response.json({
      ok: true,
      message: "Venta registrada.",
      trade: closedTrade,
    });
  } catch (error) {
    console.error(error);

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