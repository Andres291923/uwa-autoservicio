import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isAdminRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const settings = await prisma.mercadoPagoSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      return NextResponse.json({
        enabled: false,
        environment: "test",
        publicKey: "",
        hasAccessToken: false,
        accessTokenMasked: "",
        webhookSecret: "",
      });
    }

    return NextResponse.json({
      enabled: settings.enabled,
      environment: settings.environment,
      publicKey: settings.publicKey,
      hasAccessToken: Boolean(settings.accessToken),
      accessTokenMasked: maskSecret(settings.accessToken),
      webhookSecret: settings.webhookSecret,
    });
  } catch (error) {
    console.error("GET_MERCADOPAGO_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar la configuración de Mercado Pago." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const enabled = Boolean(body.enabled);
    const environment =
      body.environment === "production" ? "production" : "test";

    const publicKey = cleanText(body.publicKey);
    const accessToken = cleanText(body.accessToken);
    const webhookSecret = cleanText(body.webhookSecret);

    const current = await prisma.mercadoPagoSettings.findUnique({
      where: { id: 1 },
    });

    if (enabled && !publicKey) {
      return NextResponse.json(
        { error: "Falta Public Key de Mercado Pago." },
        { status: 400 }
      );
    }

    if (enabled && !accessToken && !current?.accessToken) {
      return NextResponse.json(
        { error: "Falta Access Token de Mercado Pago." },
        { status: 400 }
      );
    }

    const saved = await prisma.mercadoPagoSettings.upsert({
      where: { id: 1 },
      update: {
        enabled,
        environment,
        publicKey,
        accessToken: accessToken || current?.accessToken || "",
        webhookSecret,
      },
      create: {
        id: 1,
        enabled,
        environment,
        publicKey,
        accessToken,
        webhookSecret,
      },
    });

    return NextResponse.json({
      ok: true,
      enabled: saved.enabled,
      environment: saved.environment,
      publicKey: saved.publicKey,
      hasAccessToken: Boolean(saved.accessToken),
      accessTokenMasked: maskSecret(saved.accessToken),
      webhookSecret: saved.webhookSecret,
    });
  } catch (error) {
    console.error("SAVE_MERCADOPAGO_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo guardar la configuración de Mercado Pago." },
      { status: 500 }
    );
  }
}
