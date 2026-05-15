import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();

  const categoryId = Number(body.categoryId || 0);
  const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
  const name = String(body.name || "").trim();
  const unit = String(body.unit || "").trim();
  const order = Number(body.order || 0);

  if (!categoryId || !name) {
    return NextResponse.json(
      { error: "Categoria y producto son obligatorios." },
      { status: 400 }
    );
  }

  const item = await prisma.inventoryItem.create({
    data: {
      categoryId,
      subcategoryId,
      name,
      unit,
      order,
      active: true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();

  const id = Number(body.id || 0);
  const categoryId = Number(body.categoryId || 0);
  const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
  const name = String(body.name || "").trim();
  const unit = String(body.unit || "").trim();
  const order = Number(body.order || 0);
  const active = Boolean(body.active);

  if (!id) {
    return NextResponse.json({ error: "Falta ID." }, { status: 400 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      categoryId,
      subcategoryId,
      name,
      unit,
      order,
      active,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") || 0);

  if (!id) {
    return NextResponse.json({ error: "Falta ID." }, { status: 400 });
  }

  await prisma.inventoryItem.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}