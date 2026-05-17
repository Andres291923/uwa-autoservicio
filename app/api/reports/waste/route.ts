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

    const entries = await prisma.inventoryWasteEntry.findMany({
      where: {
        entryDate: {
          gte: startOfLocalDate(from),
          lte: endOfLocalDate(to),
        },
      },
      include: {
        item: {
          include: {
            category: true,
            subcategory: true,
          },
        },
      },
      orderBy: [{ amount: "desc" }],
    });

    const totalWasteAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalWasteGrams = entries.reduce((sum, entry) => sum + entry.quantityGrams, 0);

    const byCategoryMap = new Map<string, { category: string; amount: number; grams: number }>();

    for (const entry of entries) {
      const category = entry.item?.category?.name || "Sin categoria";
      const current = byCategoryMap.get(category) || {
        category,
        amount: 0,
        grams: 0,
      };

      current.amount += entry.amount;
      current.grams += entry.quantityGrams;

      byCategoryMap.set(category, current);
    }

    return NextResponse.json({
      from,
      to,
      totalWasteAmount,
      totalWasteGrams,
      totalEntries: entries.length,
      byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.amount - a.amount),
      entries,
    });
  } catch (error) {
    console.error("REPORT_WASTE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar reporte de mermas." },
      { status: 500 }
    );
  }
}
