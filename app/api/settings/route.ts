import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const defaultSettings = {
  id: 1,
  businessName: "Mi negocio",
  logoUrl: null,
  faviconUrl: null,
  idleBackgroundUrl: null,
  primaryColor: "#10B557",
  kioskSubtitle: "Autoservicio",
  kioskTitle: "Elige tus productos",
  tipsEnabled: false,
  tipPercent: 10,
};

function isAdmin(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

export async function GET() {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: {
        id: 1,
      },
    });

    return NextResponse.json(settings || defaultSettings);
  } catch (error) {
    console.error("GET_SETTINGS_ERROR", error);
    return NextResponse.json(defaultSettings);
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "No autorizado. Debes estar logueado en admin." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const businessName = String(body.businessName || "Mi negocio").trim();
    const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
    const faviconUrl = body.faviconUrl ? String(body.faviconUrl).trim() : null;
    const idleBackgroundUrl = body.idleBackgroundUrl
      ? String(body.idleBackgroundUrl).trim()
      : null;
    const primaryColor = String(body.primaryColor || "#10B557").trim();
    const kioskSubtitle = String(body.kioskSubtitle || "Autoservicio").trim();
    const kioskTitle = String(body.kioskTitle || "Elige tus productos").trim();
    const tipsEnabled = Boolean(body.tipsEnabled);
    const tipPercent = Math.max(0, Math.round(Number(body.tipPercent || 10)));

    const settings = await prisma.businessSettings.upsert({
      where: {
        id: 1,
      },
      update: {
        businessName,
        logoUrl,
        faviconUrl,
        idleBackgroundUrl,
        primaryColor,
        kioskSubtitle,
        kioskTitle,
        tipsEnabled,
        tipPercent,
      },
      create: {
        id: 1,
        businessName,
        logoUrl,
        faviconUrl,
        idleBackgroundUrl,
        primaryColor,
        kioskSubtitle,
        kioskTitle,
        tipsEnabled,
        tipPercent,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("SAVE_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo guardar la configuracion." },
      { status: 500 }
    );
  }
}


