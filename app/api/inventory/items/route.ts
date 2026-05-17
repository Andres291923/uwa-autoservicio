import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const categoryId = Number(body.categoryId || 0);
    const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
    const name = String(body.name || "").trim();
    const unit = String(body.unit || "").trim();
    const order = Number(body.order || 0);
    const wasteCostPerKg = Math.max(0, Math.round(Number(body.wasteCostPerKg || 0)));

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
        wasteCostPerKg,
        active: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("CREATE_INVENTORY_ITEM_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo crear producto." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const categoryId = Number(body.categoryId || 0);
    const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
    const name = String(body.name || "").trim();
    const unit = String(body.unit || "").trim();
    const order = Number(body.order || 0);
    const active = Boolean(body.active);
    const wasteCostPerKg = Math.max(0, Math.round(Number(body.wasteCostPerKg || 0)));

    if (!id) {
      return NextResponse.json({ error: "Falta ID." }, { status: 400 });
    }

    const data: any = {
      name,
      unit,
      order,
      active,
      wasteCostPerKg,
    };

    if (categoryId) data.categoryId = categoryId;
    data.subcategoryId = subcategoryId;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("UPDATE_INVENTORY_ITEM_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo actualizar producto." },
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

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_INVENTORY_ITEM_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo eliminar producto." },
      { status: 500 }
    );
  }
}
