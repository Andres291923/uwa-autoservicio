import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateOrigin(transaction: {
  type: string;
  reason: string;
}) {
  const reason = String(transaction.reason || "").toLowerCase();

  if (reason.includes("cashback")) return "Cashback";
  if (reason.includes("recarga")) return "Recarga manual";
  if (reason.includes("uso de saldo") || reason.includes("descuento")) return "Uso / descuento";

  return transaction.type === "credit" ? "Abono manual" : "Descuento manual";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerId = Number(body.customerId || 0);

    if (!customerId) {
      return NextResponse.json(
        { error: "Falta cliente." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        walletTransactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      transactions: customer.walletTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        reason: transaction.reason,
        orderId: transaction.orderId,
        expiresAt: transaction.expiresAt,
        createdAt: transaction.createdAt,
        origin: calculateOrigin(transaction),
      })),
    });
  } catch (error) {
    console.error("CUSTOMER_WALLET_HISTORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar el historial." },
      { status: 500 }
    );
  }
}
