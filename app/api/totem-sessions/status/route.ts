import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateBalance(transactions: { type: string; amount: number }[]) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type === "credit") return sum + transaction.amount;
    return sum - transaction.amount;
  }, 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = String(searchParams.get("code") || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: "Falta codigo." },
        { status: 400 }
      );
    }

    const session = await prisma.totemSession.findUnique({
      where: { code },
      include: {
        customer: {
          include: {
            walletTransactions: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesion no encontrada." },
        { status: 404 }
      );
    }

    if (session.status === "waiting" && session.expiresAt < new Date()) {
      await prisma.totemSession.update({
        where: { id: session.id },
        data: { status: "expired" },
      });

      return NextResponse.json({
        status: "expired",
        linked: false,
      });
    }

    if (!session.customer) {
      return NextResponse.json({
        status: session.status,
        linked: false,
        expiresAt: session.expiresAt,
      });
    }

    const walletBalance = calculateBalance(session.customer.walletTransactions);

    return NextResponse.json({
      status: session.status,
      linked: true,
      expiresAt: session.expiresAt,
      customer: {
        id: session.customer.id,
        name: session.customer.name,
        email: session.customer.email,
        active: session.customer.active,
        walletBalance,
      },
    });
  } catch (error) {
    console.error("TOTEM_SESSION_STATUS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo revisar sesion." },
      { status: 500 }
    );
  }
}
