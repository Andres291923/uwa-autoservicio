import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(request: Request) {
  if (process.env.NODE_ENV === "development") return true;

  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

export async function GET() {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: 1 },
      select: {
        couponsVisible: true,
      },
    });

    return NextResponse.json({
      couponsVisible: settings?.couponsVisible ?? true,
    });
  } catch (error) {
    console.error("GET_COUPON_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar la configuracion de cupones." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();

    const couponsVisible =
      body.couponsVisible === true ||
      body.couponsVisible === "true" ||
      body.couponsVisible === 1;

    const settings = await prisma.businessSettings.upsert({
      where: { id: 1 },
      update: {
        couponsVisible,
      },
      create: {
        id: 1,
        couponsVisible,
      },
      select: {
        couponsVisible: true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("UPDATE_COUPON_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo guardar la configuracion de cupones." },
      { status: 500 }
    );
  }
}