import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfLocalDate(dateText: string) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateText = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const entryDate = startOfLocalDate(dateText);

  const [categories, entries] = await Promise.all([
    prisma.inventoryCategory.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        subcategories: {
          where: { active: true },
          orderBy: [{ order: "asc" }, { name: "asc" }],
        },
        items: {
          where: { active: true },
          orderBy: [{ order: "asc" }, { name: "asc" }],
          include: {
            subcategory: true,
          },
        },
      },
    }),
    prisma.inventoryEntry.findMany({
      where: { entryDate },
    }),
  ]);

  const entryMap = new Map(entries.map((entry) => [entry.itemId, entry]));

  return NextResponse.json({
    date: dateText,
    categories: categories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        entry: entryMap.get(item.id) || null,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const dateText = String(body.date || "").trim();
  const entryDate = startOfLocalDate(dateText);
  const entries = Array.isArray(body.entries) ? body.entries : [];

  if (!dateText) {
    return NextResponse.json({ error: "Fecha obligatoria." }, { status: 400 });
  }

  for (const entry of entries) {
    const itemId = Number(entry.itemId || 0);
    const quantity = Number(entry.quantity || 0);
    const comment = String(entry.comment || "").trim();

    if (!itemId) continue;

    await prisma.inventoryEntry.upsert({
      where: {
        entryDate_itemId: {
          entryDate,
          itemId,
        },
      },
      update: {
        quantity,
        comment,
      },
      create: {
        entryDate,
        itemId,
        quantity,
        comment,
      },
    });
  }

  return NextResponse.json({ ok: true });
}