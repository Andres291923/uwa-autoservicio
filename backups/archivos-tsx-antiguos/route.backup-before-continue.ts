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

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function buildSummary(invoices: any[]) {
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
    const amount = Number(invoice.totalAmount || 0);
    summary.totalPurchases += amount;

    if (invoice.category === "direct_input") summary.totalDirectInput += amount;
    else if (invoice.category === "packaging") summary.totalPackaging += amount;
    else if (invoice.category === "fixed_expense") summary.totalFixedExpense += amount;
    else if (invoice.category === "service") summary.totalService += amount;
    else if (invoice.category === "investment") summary.totalInvestment += amount;
    else if (invoice.category === "ignore") summary.totalIgnored += amount;
    else summary.totalUnclassified += amount;
  }

  return summary;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from") || todayInput();
    const to = searchParams.get("to") || from;
    const category = searchParams.get("category") || "all";
    const q = String(searchParams.get("q") || "").trim();

    const where: any = {
      issueDate: {
        gte: startOfLocalDate(from),
        lte: endOfLocalDate(to),
      },
    };

    if (category !== "all") {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { supplierName: { contains: q } },
        { supplierRut: { contains: q } },
        { folio: { contains: q } },
      ];
    }

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { id: "desc" }],
      take: 500,
    });

    return NextResponse.json({
      from,
      to,
      category,
      q,
      invoices,
      summary: buildSummary(invoices),
    });
  } catch (error) {
    console.error("GET_PURCHASES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las compras." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const category = String(body.category || "unclassified");
    const note = String(body.note || "").trim();

    const allowed = [
      "unclassified",
      "direct_input",
      "packaging",
      "fixed_expense",
      "service",
      "investment",
      "ignore",
    ];

    if (!id) {
      return NextResponse.json({ error: "Falta ID." }, { status: 400 });
    }

    if (!allowed.includes(category)) {
      return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
    }

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: { category, note },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("UPDATE_PURCHASE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la compra." },
      { status: 500 }
    );
  }
}
