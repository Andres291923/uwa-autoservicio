import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateWalletBalance,
  isValidPin,
  normalizeCustomerEmail,
  normalizePin,
  verifyTotemPin,
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

    const email = normalizeCustomerEmail(body.email || body.correo);
    const pin = normalizePin(body.pin);

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

    const customer = await prisma.customer.findUnique({
      where: { email },
      include: {
        walletTransactions: true,
      },
    });

    if (!customer || !customer.active) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 }
      );
    }

    if (!customer.pinHash) {
      return NextResponse.json(
        {
          error: "Esta cuenta aun no tiene PIN. Activa tu PIN primero.",
          needsPinSetup: true,
        },
        { status: 400 }
      );
    }

    if (customer.pinLockedUntil && customer.pinLockedUntil > new Date()) {
      return NextResponse.json(
        { error: "PIN bloqueado temporalmente. Intenta mas tarde." },
        { status: 423 }
      );
    }

    const valid = verifyTotemPin(pin, customer.pinHash);

    if (!valid) {
      const nextAttempts = (customer.pinAttempts || 0) + 1;
      const shouldLock = nextAttempts >= 5;

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          pinAttempts: shouldLock ? 0 : nextAttempts,
          pinLockedUntil: shouldLock
            ? new Date(Date.now() + 1000 * 60 * 5)
            : null,
        },
      });

      return NextResponse.json(
        {
          error: shouldLock
            ? "PIN bloqueado por 5 minutos."
            : `PIN incorrecto. Intento ${nextAttempts}/5.`,
        },
        { status: 401 }
      );
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    return NextResponse.json({
      ok: true,
      customer: safeCustomer(customer),
    });
  } catch (error) {
    console.error("TOTEM_PIN_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo ingresar con PIN." },
      { status: 500 }
    );
  }
}
