import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateWalletBalance,
  hashTotemPin,
  isValidPin,
  normalizeCustomerEmail,
  normalizePin,
} from "@/lib/totem-pin";

export const runtime = "nodejs";

function safeCustomer(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    active: customer.active,
    walletBalance: calculateWalletBalance(customer.walletTransactions || []),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || body.nombre || "").trim();
    const email = normalizeCustomerEmail(body.email || body.correo);
    const pin = normalizePin(body.pin);

    if (!name) {
      return NextResponse.json(
        { error: "Ingresa tu nombre." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Ingresa un correo valido." },
        { status: 400 }
      );
    }

    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "El PIN debe tener 4 digitos." },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Ya existe una cuenta con ese correo. Usa Ingresar o Activar PIN.",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        passwordHash: null,
        pinHash: hashTotemPin(pin),
        pinAttempts: 0,
        pinLockedUntil: null,
        active: true,
      },
      include: {
        walletTransactions: true,
      },
    });

    return NextResponse.json({
      ok: true,
      customer: safeCustomer(customer),
    });
  } catch (error: any) {
    console.error("TOTEM_REGISTER_PIN_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo crear la cuenta." },
      { status: 500 }
    );
  }
}
