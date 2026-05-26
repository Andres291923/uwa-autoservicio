import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBeverageText(value: string) {
  const text = normalizeText(value);

  return (
    text.includes("bebida") ||
    text.includes("jugo") ||
    text.includes("agua") ||
    text.includes("coca") ||
    text.includes("vital")
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const periodDays = Math.max(
      1,
      Math.min(365, Number(url.searchParams.get("days") || 30))
    );

    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: since,
          },
          status: {
            not: "cancelled",
          },
        },
        product: {
          active: true,
          category: {
            active: true,
          },
        },
      },
      select: {
        productId: true,
        quantity: true,
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const totals = new Map<number, number>();

    for (const item of items) {
      const productText = `${item.product?.name || ""} ${item.product?.category?.name || ""}`;

      // En el tótem queremos destacar bowls/comida, no bebidas externas.
      if (isBeverageText(productText)) continue;

      totals.set(
        item.productId,
        (totals.get(item.productId) || 0) + Number(item.quantity || 0)
      );
    }

    const ranking = Array.from(totals.entries())
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity || a.productId - b.productId);

    const best = ranking[0] || null;

    return NextResponse.json({
      periodDays,
      bestSellerProductId: best?.productId || null,
      totalQuantity: best?.quantity || 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("TOTEM_BEST_SELLERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo calcular el producto mas vendido." },
      { status: 500 }
    );
  }
}
