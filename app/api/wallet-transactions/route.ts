import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerId = Number(body.customerId);
    const type = String(body.type || "");
    const amount = Math.round(Number(body.amount || 0));
    const reason = String(body.reason || "").trim();
    const orderId = body.orderId ? Number(body.orderId) : null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (!customerId) {
      return NextResponse.json(
        { error: "Falta el cliente." },
        { status: 400 }
      );
    }

    if (!["credit", "debit"].includes(type)) {
      return NextResponse.json(
        { error: "El tipo debe ser credit o debit." },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a cero." },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Debes ingresar un motivo." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 }
      );
    }

    const transaction = await prisma.walletTransaction.create({
      data: {
        customerId,
        type,
        amount,
        reason,
        orderId,
        expiresAt,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("CREATE_WALLET_TRANSACTION_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear el movimiento de billetera." },
      { status: 500 }
    );
  }
}
