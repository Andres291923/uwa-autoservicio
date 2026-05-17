import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function createCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  return `http://${host}`;
}

async function createTotemSession(request: Request) {
  try {
    let code = createCode();

    for (let i = 0; i < 5; i++) {
      const existing = await prisma.totemSession.findUnique({
        where: { code },
      });

      if (!existing) break;
      code = createCode();
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    const session = await prisma.totemSession.create({
      data: {
        code,
        status: "waiting",
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl(request);

    return NextResponse.json({
      code: session.code,
      expiresAt: session.expiresAt,
      loginUrl: `${baseUrl}/totem-identificacion?session=${session.code}`,
    });
  } catch (error) {
    console.error("CREATE_TOTEM_SESSION_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear sesion de totem." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return createTotemSession(request);
}

export async function POST(request: Request) {
  return createTotemSession(request);
}
