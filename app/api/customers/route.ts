import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateBalance(transactions: { type: string; amount: number }[]) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type === "credit") return sum + transaction.amount;
    if (transaction.type === "debit") return sum - transaction.amount;
    return sum;
  }, 0);
}

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        walletTransactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const data = customers.map((customer) => ({
      ...customer,
      walletBalance: calculateBalance(customer.walletTransactions),
      totalCredits: customer.walletTransactions
        .filter((transaction) => transaction.type === "credit")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      totalDebits: customer.walletTransactions
        .filter((transaction) => transaction.type === "debit")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET_CUSTOMERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los clientes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "El correo es obligatorio." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        active: true,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("CREATE_CUSTOMER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear el cliente. Puede que el correo ya exista." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del cliente." },
        { status: 400 }
      );
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nombre y correo son obligatorios." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: {
        id,
      },
      data: {
        name,
        email,
        active,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("UPDATE_CUSTOMER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el cliente." },
      { status: 500 }
    );
  }
}
