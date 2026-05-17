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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date") || todayInput();
    const from = searchParams.get("from") || date;
    const to = searchParams.get("to") || date;

    const [categories, entries] = await Promise.all([
      prisma.inventoryCategory.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        include: {
          items: {
            where: { active: true },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            include: {
              subcategory: true,
            },
          },
        },
      }),
      prisma.inventoryWasteEntry.findMany({
        where: {
          entryDate: {
            gte: startOfLocalDate(from),
            lte: endOfLocalDate(to),
          },
        },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        include: {
          item: {
            include: {
              category: true,
              subcategory: true,
            },
          },
        },
      }),
    ]);

    const totalWasteAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalWasteGrams = entries.reduce((sum, entry) => sum + entry.quantityGrams, 0);

    const byItemMap = new Map<string, { name: string; amount: number; grams: number; count: number }>();

    for (const entry of entries) {
      const name = entry.item?.name || entry.productName || "Sin producto";
      const current = byItemMap.get(name) || {
        name,
        amount: 0,
        grams: 0,
        count: 0,
      };

      current.amount += entry.amount;
      current.grams += entry.quantityGrams;
      current.count += 1;

      byItemMap.set(name, current);
    }

    return NextResponse.json({
      date,
      from,
      to,
      categories,
      entries,
      summary: {
        totalWasteAmount,
        totalWasteGrams,
        totalEntries: entries.length,
        byItem: Array.from(byItemMap.values()).sort((a, b) => b.amount - a.amount),
      },
    });
  } catch (error) {
    console.error("GET_WASTE_ERROR", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las mermas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const dateText = String(body.date || "").trim();
    const itemId = body.itemId ? Number(body.itemId) : null;
    const productName = String(body.productName || "").trim();
    const quantityGrams = Math.max(0, Number(body.quantityGrams || 0));
    const manualAmount = Math.max(0, Math.round(Number(body.amount || 0)));
    const comment = String(body.comment || "").trim();
    const source = String(body.source || "manual").trim();

    if (!dateText) {
      return NextResponse.json({ error: "Fecha obligatoria." }, { status: 400 });
    }

    if (!itemId && !productName) {
      return NextResponse.json(
        { error: "Selecciona producto o escribe nombre." },
        { status: 400 }
      );
    }

    let finalAmount = manualAmount;
    let finalProductName = productName;

    if (itemId) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return NextResponse.json(
          { error: "Producto no encontrado." },
          { status: 404 }
        );
      }

      finalProductName = item.name;

      if (finalAmount <= 0 && quantityGrams > 0 && item.wasteCostPerKg > 0) {
        finalAmount = Math.round((quantityGrams / 1000) * item.wasteCostPerKg);
      }
    }

    const entry = await prisma.inventoryWasteEntry.create({
      data: {
        entryDate: startOfLocalDate(dateText),
        itemId,
        productName: finalProductName,
        quantityGrams,
        amount: finalAmount,
        comment,
        source,
      },
      include: {
        item: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("CREATE_WASTE_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo guardar la merma." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id") || 0);

    if (!id) {
      return NextResponse.json({ error: "Falta ID." }, { status: 400 });
    }

    await prisma.inventoryWasteEntry.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_WASTE_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la merma." },
      { status: 500 }
    );
  }
}
