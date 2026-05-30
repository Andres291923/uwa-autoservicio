import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAllowedPins() {
  return [
    process.env.COMANDA_PIN,
    process.env.COMPANY_ORDER_APPROVAL_PIN,
    process.env.ADMIN_PASSWORD,
    process.env.NODE_ENV !== "production" ? "1234" : "",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const clave = String(body.clave || body.password || "").trim();

    if (!clave) {
      return NextResponse.json(
        { error: "Ingresa la clave de comanda." },
        { status: 400 }
      );
    }

    const allowedPins = getAllowedPins();

    if (allowedPins.length === 0) {
      return NextResponse.json(
        { error: "COMANDA_PIN no esta configurado." },
        { status: 500 }
      );
    }

    if (!allowedPins.includes(clave)) {
      return NextResponse.json(
        { error: "Clave incorrecta." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(
      "comanda_session",
      process.env.COMANDA_SESSION_TOKEN || "comanda-session",
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      }
    );

    return response;
  } catch (error) {
    console.error("COMANDA_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo iniciar comanda." },
      { status: 500 }
    );
  }
}