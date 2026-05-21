import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function moneyNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCustomerId = Number(searchParams.get("companyCustomerId") || 0);

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
      select: {
        id: true,
        companyName: true,
        walletBalance: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    const transactions = await prisma.companyWalletTransaction.findMany({
      where: { companyCustomerId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: true,
      },
    });

    return NextResponse.json({
      company,
      transactions,
    });
  } catch (error) {
    console.error("GET_COMPANY_WALLET_TRANSACTIONS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar saldo empresa." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyCustomerId = Number(body.companyCustomerId || 0);
    const invoiceIdRaw = body.invoiceId ? Number(body.invoiceId) : null;
    const amount = moneyNumber(body.amount);
    const reason = String(body.reason || "Carga manual saldo empresa").trim();
    const createdBy = String(body.createdBy || "admin").trim();

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a cero." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    if (invoiceIdRaw) {
      const invoice = await prisma.companyInvoice.findFirst({
        where: {
          id: invoiceIdRaw,
          companyCustomerId,
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: "La factura no pertenece a esta empresa." },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedCompany = await tx.companyCustomer.update({
        where: { id: companyCustomerId },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
      });

      const transaction = await tx.companyWalletTransaction.create({
        data: {
          companyCustomerId,
          invoiceId: invoiceIdRaw,
          type: "credit",
          amount,
          balanceAfter: updatedCompany.walletBalance,
          reason,
          source: "manual_admin",
          createdBy,
        },
        include: {
          invoice: true,
        },
      });

      return {
        company: updatedCompany,
        transaction,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST_COMPANY_WALLET_TRANSACTIONS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar saldo empresa." },
      { status: 500 }
    );
  }
}
