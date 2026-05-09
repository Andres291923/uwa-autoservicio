import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);
    const categoryId = Number(body.categoryId || 0);
    const imageUrl = String(body.imageUrl || "").trim();
    const order = Number(body.order || 0);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del producto es obligatorio." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Debes seleccionar una categoría." },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        order,
        active: true,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo crear el producto." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);
    const categoryId = Number(body.categoryId || 0);
    const imageUrl = String(body.imageUrl || "").trim();
    const order = Number(body.order || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "El ID del producto es obligatorio." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del producto es obligatorio." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Debes seleccionar una categoría." },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0." },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        order,
        active,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo editar el producto." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "El ID del producto es obligatorio." },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: {
        id,
      },
      data: {
        active,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo actualizar el producto." },
      { status: 500 }
    );
  }
}