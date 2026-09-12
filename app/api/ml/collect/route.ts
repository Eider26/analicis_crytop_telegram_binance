import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    return Response.json({
      ok: true,
      message: "Dato ML recibido correctamente.",
      data: body,
    });
  } catch (error) {
    console.error("Error en /api/ml/collect:", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "Ruta /api/ml/collect funcionando.",
  });
}
