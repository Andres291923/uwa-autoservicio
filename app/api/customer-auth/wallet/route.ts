import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const customerId = Number(body.customerId);

    if (!customerId) {
      return NextResponse.json({ error: "Falta el cliente." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        walletTransactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      active: customer.active,
      walletBalance: calculateBalance(customer.walletTransactions),
      walletTransactions: customer.walletTransactions,
    });
  } catch (error) {
    console.error("CUSTOMER_WALLET_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar la billetera." },
      { status: 500 }
    );
  }
}
