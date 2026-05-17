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

function extractCustomer(data: any) {
  return data?.customer || data?.user || data?.loggedCustomer || data;
}

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
    const password = String(body.password || body.clave || "");
    const pin = normalizePin(body.pin);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Ingresa un correo valido." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Ingresa tu clave de pedido online." },
        { status: 400 }
      );
    }

    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "El PIN debe tener 4 digitos." },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    const loginResponse = await fetch(`${origin}/api/customer-auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        correo: email,
        clave: password,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return NextResponse.json(
        { error: loginData.error || "Correo o clave incorrectos." },
        { status: 401 }
      );
    }

    const loginCustomer = extractCustomer(loginData);
    const customerId = Number(loginCustomer?.id || loginData?.customerId || 0);

    if (!customerId) {
      return NextResponse.json(
        { error: "No se pudo validar la cuenta online." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        pinHash: hashTotemPin(pin),
        pinAttempts: 0,
        pinLockedUntil: null,
      },
      include: {
        walletTransactions: true,
      },
    });

    return NextResponse.json({
      ok: true,
      customer: safeCustomer(customer),
    });
  } catch (error) {
    console.error("TOTEM_SETUP_PIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo activar el PIN." },
      { status: 500 }
    );
  }
}
