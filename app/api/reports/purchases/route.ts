import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfLocalDate(dateText: string) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfLocalDate(dateText: string) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from") || new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") || from;

    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        issueDate: {
          gte: startOfLocalDate(from),
          lte: endOfLocalDate(to),
        },
      },
    });

    const summary = {
      totalPurchases: 0,
      totalDirectInput: 0,
      totalPackaging: 0,
      totalFixedExpense: 0,
      totalService: 0,
      totalInvestment: 0,
      totalIgnored: 0,
      totalUnclassified: 0,
      invoiceCount: invoices.length,
    };

    for (const invoice of invoices) {
      const amount = invoice.totalAmount;
      summary.totalPurchases += amount;

      if (invoice.category === "direct_input") summary.totalDirectInput += amount;
      else if (invoice.category === "packaging") summary.totalPackaging += amount;
      else if (invoice.category === "fixed_expense") summary.totalFixedExpense += amount;
      else if (invoice.category === "service") summary.totalService += amount;
      else if (invoice.category === "investment") summary.totalInvestment += amount;
      else if (invoice.category === "ignore") summary.totalIgnored += amount;
      else summary.totalUnclassified += amount;
    }

    return NextResponse.json({
      from,
      to,
      summary,
    });
  } catch (error) {
    console.error("REPORT_PURCHASES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar reporte de compras." },
      { status: 500 }
    );
  }
}
