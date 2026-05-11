import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) return false;

  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

function calculateBalance(transactions: { type: string; amount: number }[]) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type === "credit") return sum + transaction.amount;
    if (transaction.type === "debit") return sum - transaction.amount;
    return sum;
  }, 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y clave son obligatorios." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      include: { walletTransactions: true },
    });

    if (!customer || !customer.active) {
      return NextResponse.json(
        { error: "Cliente no encontrado o inactivo." },
        { status: 404 }
      );
    }

    if (!verifyPassword(password, customer.passwordHash)) {
      return NextResponse.json(
        { error: "Correo o clave incorrectos." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      active: customer.active,
      walletBalance: calculateBalance(customer.walletTransactions),
    });
  } catch (error) {
    console.error("CUSTOMER_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo ingresar." },
      { status: 500 }
    );
  }
}
