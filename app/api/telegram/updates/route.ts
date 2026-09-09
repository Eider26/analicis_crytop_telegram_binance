import { NextRequest } from "next/server";

const TELEGRAM_BASE = "https://api.telegram.org";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const cronSecret = process.env.CRON_SECRET;

  if (!token) {
    return Response.json(
      {
        ok: false,
        error: "Falta TELEGRAM_BOT_TOKEN en .env.local"
      },
      { status: 500 }
    );
  }

  if (cronSecret) {
    const auth = req.headers.get("authorization");

    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json(
        {
          ok: false,
          error: "No autorizado"
        },
        { status: 401 }
      );
    }
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const res = await fetch(
      `${TELEGRAM_BASE}/bot${token}/getUpdates`,
      {
        method: "POST",
        signal: controller.signal,
        cache: "no-store"
      }
    );

    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return Response.json(
        {
          ok: false,
          error: "Telegram rechazó la solicitud",
          telegram: data
        },
        { status: 502 }
      );
    }

    const updates = Array.isArray(data.result)
      ? data.result
      : [];

    const chats = updates
      .map((update: any) => {
        const message =
          update.message ??
          update.edited_message ??
          update.channel_post;

        if (!message?.chat) return null;

        return {
          chat_id: message.chat.id,
          type: message.chat.type,
          title: message.chat.title ?? null,
          username: message.chat.username ?? null,
          first_name: message.chat.first_name ?? null
        };
      })
      .filter(Boolean);

    return Response.json({
      ok: true,
      chats,
      updates
    });

  } catch (error: any) {
    const message =
      error?.name === "AbortError"
        ? "Telegram no respondió dentro de 15 segundos"
        : error?.message ?? "Error desconocido";

    console.error("Telegram connection error:", error);

    return Response.json(
      {
        ok: false,
        error: "No se pudo conectar con Telegram",
        details: message
      },
      { status: 502 }
    );
  }
}