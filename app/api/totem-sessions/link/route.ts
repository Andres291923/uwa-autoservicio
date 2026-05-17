import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = String(body.code || "").trim().toUpperCase();
    const customerId = Number(body.customerId || 0);

    if (!code || !customerId) {
      return NextResponse.json(
        { error: "Falta codigo o cliente." },
        { status: 400 }
      );
    }

    const session = await prisma.totemSession.findUnique({
      where: { code },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesion no encontrada." },
        { status: 404 }
      );
    }

    if (session.expiresAt < new Date()) {
      await prisma.totemSession.update({
        where: { id: session.id },
        data: { status: "expired" },
      });

      return NextResponse.json(
        { error: "Sesion expirada. Genera un nuevo QR." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || !customer.active) {
      return NextResponse.json(
        { error: "Cliente no encontrado o inactivo." },
        { status: 404 }
      );
    }

    const updated = await prisma.totemSession.update({
      where: { id: session.id },
      data: {
        status: "linked",
        customerId: customer.id,
      },
    });

    return NextResponse.json({
      ok: true,
      code: updated.code,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("LINK_TOTEM_SESSION_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo enlazar cliente." },
      { status: 500 }
    );
  }
}
