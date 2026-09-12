import { supabaseAdmin } from "./supabase";

export async function getOpenTrade(symbol = "SOLUSDT") {
  const { data, error } = await supabaseAdmin
    .from("trading_positions")
    .select("*")
    .eq("symbol", symbol)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando operación: ${error.message}`
    );
  }

  return data;
}

export async function openTrade({
  entryPrice,
  quantity,
  stopLoss,
  takeProfit,
  signalScore,
  signal,
}: {
  entryPrice: number;
  quantity?: number;
  stopLoss: number;
  takeProfit: number;
  signalScore?: number;
  signal?: string;
}) {
  const existing = await getOpenTrade();

  if (existing) {
    throw new Error(
      "Ya existe una operación abierta para SOLUSDT."
    );
  }

  const { data, error } = await supabaseAdmin
    .from("trading_positions")
    .insert({
      symbol: "SOLUSDT",
      status: "OPEN",
      entry_price: entryPrice,
      quantity: quantity ?? null,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      signal_score: signalScore ?? null,
      signal: signal ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error creando operación: ${error.message}`
    );
  }

  return data;
}

export function calculateProfitLoss(
  entryPrice: number,
  currentPrice: number
) {
  const profitLoss = currentPrice - entryPrice;

  const profitLossPercent =
    ((currentPrice - entryPrice) / entryPrice) * 100;

  return {
    profitLoss,
    profitLossPercent,
  };
}

export async function updateTradePrice(
  tradeId: string,
  currentPrice: number
) {
  const { data: trade, error: findError } =
    await supabaseAdmin
      .from("trading_positions")
      .select("*")
      .eq("id", tradeId)
      .single();

  if (findError || !trade) {
    throw new Error("Operación no encontrada.");
  }

  const { profitLoss, profitLossPercent } =
    calculateProfitLoss(
      Number(trade.entry_price),
      currentPrice
    );

  const { data, error } = await supabaseAdmin
    .from("trading_positions")
    .update({
      current_price: currentPrice,
      profit_loss: profitLoss,
      profit_loss_percent: profitLossPercent,
    })
    .eq("id", tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error actualizando operación: ${error.message}`
    );
  }

  return data;
}

export async function closeTrade(
  tradeId: string,
  exitPrice: number
) {
  const { data: trade, error: findError } =
    await supabaseAdmin
      .from("trading_positions")
      .select("*")
      .eq("id", tradeId)
      .eq("status", "OPEN")
      .single();

  if (findError || !trade) {
    throw new Error("Operación abierta no encontrada.");
  }

  const { profitLoss, profitLossPercent } =
    calculateProfitLoss(
      Number(trade.entry_price),
      exitPrice
    );

  const { data, error } = await supabaseAdmin
    .from("trading_positions")
    .update({
      status: "CLOSED",
      exit_price: exitPrice,
      current_price: exitPrice,
      profit_loss: profitLoss,
      profit_loss_percent: profitLossPercent,
      closed_at: new Date().toISOString(),
    })
    .eq("id", tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error cerrando operación: ${error.message}`
    );
  }

  return data;
}