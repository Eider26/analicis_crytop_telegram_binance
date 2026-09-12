import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    return Response.json({
      ok: true,
      message: "Ruta de predicción ML funcionando.",
      prediction: null,
      input: body,
    });
  } catch (error) {
    console.error("Error en /api/ml/predict:", error);

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
    message: "Ruta /api/ml/predict funcionando.",
    prediction: null,
  });
}
