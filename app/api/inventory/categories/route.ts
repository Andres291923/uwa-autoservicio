import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.inventoryCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        subcategories: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
        },
        items: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          include: {
            subcategory: true,
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET_INVENTORY_CATEGORIES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las categorias." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const order = Number(body.order || 0);

    if (!name) {
      return NextResponse.json(
        { error: "Nombre obligatorio." },
        { status: 400 }
      );
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        name,
        order,
        active: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("CREATE_INVENTORY_CATEGORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear la categoria." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const name = String(body.name || "").trim();
    const order = Number(body.order || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "Falta ID." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nombre obligatorio." },
        { status: 400 }
      );
    }

    const category = await prisma.inventoryCategory.update({
      where: { id },
      data: {
        name,
        order,
        active,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("UPDATE_INVENTORY_CATEGORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la categoria." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id") || 0);

    if (!id) {
      return NextResponse.json(
        { error: "Falta ID." },
        { status: 400 }
      );
    }

    await prisma.inventoryCategory.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_INVENTORY_CATEGORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la categoria." },
      { status: 500 }
    );
  }
}
