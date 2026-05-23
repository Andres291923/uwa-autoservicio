import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.cashbackRule.findMany({
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET_CASHBACK_RULES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las reglas de cashback." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rule = await prisma.cashbackRule.create({
      data: {
        name: String(body.name || "Regla cashback").trim(),
        active: Boolean(body.active),
        cashbackPercent: Number(body.cashbackPercent || 0),
        minPurchase: Math.round(Number(body.minPurchase || 0)),
        maxCashback: Math.round(Number(body.maxCashback || 0)),
        allowedPaymentMethods: String(body.allowedPaymentMethods || "all"),
        dailyStartTime: String(body.dailyStartTime || "").trim(),
        dailyEndTime: String(body.dailyEndTime || "").trim(),
        includedCategoryIds: String(body.includedCategoryIds || "all"),
        excludedProductIds: String(body.excludedProductIds || ""),
        validityDays: Math.round(Number(body.validityDays || 0)),
        commercialText: String(body.commercialText || ""),
        priority: Math.round(Number(body.priority || 0)),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("CREATE_CASHBACK_RULE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear la regla de cashback." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la regla." },
        { status: 400 }
      );
    }

    const rule = await prisma.cashbackRule.update({
      where: {
        id,
      },
      data: {
        name: String(body.name || "Regla cashback").trim(),
        active: Boolean(body.active),
        cashbackPercent: Number(body.cashbackPercent || 0),
        minPurchase: Math.round(Number(body.minPurchase || 0)),
        maxCashback: Math.round(Number(body.maxCashback || 0)),
        allowedPaymentMethods: String(body.allowedPaymentMethods || "all"),
        dailyStartTime: String(body.dailyStartTime || "").trim(),
        dailyEndTime: String(body.dailyEndTime || "").trim(),
        includedCategoryIds: String(body.includedCategoryIds || "all"),
        excludedProductIds: String(body.excludedProductIds || ""),
        validityDays: Math.round(Number(body.validityDays || 0)),
        commercialText: String(body.commercialText || ""),
        priority: Math.round(Number(body.priority || 0)),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("UPDATE_CASHBACK_RULE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la regla de cashback." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la regla." },
        { status: 400 }
      );
    }

    await prisma.cashbackRule.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_CASHBACK_RULE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la regla de cashback." },
      { status: 500 }
    );
  }
}
