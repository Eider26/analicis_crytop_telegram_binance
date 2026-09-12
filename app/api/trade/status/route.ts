import { getTicker } from "../../../../lib/binance";
import {
  getOpenTrade,
  updateTradePrice,
} from "../../../../lib/trades";

export async function GET() {
  try {
    const trade = await getOpenTrade();

    if (!trade) {
      return Response.json({
        ok: true,
        open: false,
        message: "No hay operación abierta.",
      });
    }

    const ticker = await getTicker();

    const currentPrice = Number(ticker.price);

    const updatedTrade =
      await updateTradePrice(
        trade.id,
        currentPrice
      );

    const stopLossReached =
      currentPrice <=
      Number(updatedTrade.stop_loss);

    const takeProfitReached =
      currentPrice >=
      Number(updatedTrade.take_profit);

    let status = "NEUTRAL";

    if (takeProfitReached) {
      status = "TAKE_PROFIT";
    } else if (stopLossReached) {
      status = "STOP_LOSS";
    } else if (
      Number(updatedTrade.profit_loss_percent) > 0
    ) {
      status = "FAVORABLE";
    } else if (
      Number(updatedTrade.profit_loss_percent) < 0
    ) {
      status = "DESFAVORABLE";
    }

    return Response.json({
      ok: true,
      open: true,
      status,
      trade: updatedTrade,
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