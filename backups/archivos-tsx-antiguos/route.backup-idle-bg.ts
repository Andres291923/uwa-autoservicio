import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const defaultSettings = {
  id: 1,
  businessName: "Mi negocio",
  logoUrl: null,
  primaryColor: "#10B557",
  kioskSubtitle: "Autoservicio",
  kioskTitle: "Elige tus productos",
};

function isAdmin(request: Request) {
  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

export async function GET() {
  const settings = await prisma.businessSettings.findUnique({
    where: {
      id: 1,
    },
  });

  return NextResponse.json(settings || defaultSettings);
}

export async function PUT(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const businessName = String(body.businessName || "").trim();
    const logoUrl = String(body.logoUrl || "").trim();
    const primaryColor = String(body.primaryColor || "#10B557").trim();
    const kioskSubtitle = String(body.kioskSubtitle || "").trim();
    const kioskTitle = String(body.kioskTitle || "").trim();

    if (!businessName) {
      return NextResponse.json(
        { error: "El nombre del negocio es obligatorio." },
        { status: 400 }
      );
    }

    if (!kioskTitle) {
      return NextResponse.json(
        { error: "El título del tótem es obligatorio." },
        { status: 400 }
      );
    }

    const settings = await prisma.businessSettings.upsert({
      where: {
        id: 1,
      },
      update: {
        businessName,
        logoUrl: logoUrl || null,
        primaryColor,
        kioskSubtitle: kioskSubtitle || "Autoservicio",
        kioskTitle,
      },
      create: {
        id: 1,
        businessName,
        logoUrl: logoUrl || null,
        primaryColor,
        kioskSubtitle: kioskSubtitle || "Autoservicio",
        kioskTitle,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}