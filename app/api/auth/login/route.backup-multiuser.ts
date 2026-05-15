import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const adminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const adminPassword = String(process.env.ADMIN_PASSWORD || "");
    const sessionToken = String(process.env.ADMIN_SESSION_TOKEN || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Debes ingresar correo y clave." },
        { status: 400 }
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: "Correo o clave incorrectos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      message: "Ingreso correcto.",
    });

    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}