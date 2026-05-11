import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
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

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "El correo es obligatorio." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "La clave debe tener al menos 4 caracteres." }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
      include: { walletTransactions: true },
    });

    if (existingCustomer?.passwordHash) {
      return NextResponse.json(
        { error: "Este correo ya tiene cuenta. Ingresa con tu clave." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name,
            passwordHash,
            active: true,
          },
          include: { walletTransactions: true },
        })
      : await prisma.customer.create({
          data: {
            name,
            email,
            passwordHash,
            active: true,
          },
          include: { walletTransactions: true },
        });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      active: customer.active,
      walletBalance: calculateBalance(customer.walletTransactions),
    });
  } catch (error) {
    console.error("CUSTOMER_REGISTER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo registrar el cliente." },
      { status: 500 }
    );
  }
}
