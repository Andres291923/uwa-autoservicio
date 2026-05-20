import { NextResponse } from "next/server";
import * as prismaModule from "@/lib/prisma";

const prisma = ((prismaModule as any).prisma || (prismaModule as any).default) as any;

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "none") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export async function GET() {
  try {
    const stockItems = await prisma.stockItem.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            active: true,
          },
        },
        modifierOption: {
          select: {
            id: true,
            name: true,
            price: true,
            active: true,
            template: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        movements: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    return NextResponse.json(stockItems);
  } catch (error) {
    console.error("GET /api/beverage-stock error:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el stock de bebidas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const currentStock = Number(body.currentStock || 0);
    const minStock = Number(body.minStock || 0);
    const productId = toNullableNumber(body.productId);
    const modifierOptionId = toNullableNumber(body.modifierOptionId);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la bebida es obligatorio." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(currentStock) || currentStock < 0) {
      return NextResponse.json(
        { error: "El stock actual debe ser un número válido mayor o igual a 0." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(minStock) || minStock < 0) {
      return NextResponse.json(
        { error: "El stock mínimo debe ser un número válido mayor o igual a 0." },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const stockItem = await tx.stockItem.create({
        data: {
          name,
          currentStock,
          minStock,
          active: true,
          productId,
          modifierOptionId,
        },
      });

      if (currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            type: "purchase",
            quantity: currentStock,
            previousStock: 0,
            newStock: currentStock,
            reason: "Stock inicial",
          },
        });
      }

      return stockItem;
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/beverage-stock error:", error);

    return NextResponse.json(
      { error: "No se pudo crear el stock de bebida." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const action = String(body.action || "update");

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID inválido." },
        { status: 400 }
      );
    }

    const current = await prisma.stockItem.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Stock no encontrado." },
        { status: 404 }
      );
    }

    if (action === "add_stock") {
      const quantity = Number(body.quantity || 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "La cantidad a sumar debe ser mayor a 0." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        const newStock = current.currentStock + quantity;

        const stockItem = await tx.stockItem.update({
          where: { id },
          data: {
            currentStock: newStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            stockItemId: id,
            type: "purchase",
            quantity,
            previousStock: current.currentStock,
            newStock,
            reason: body.reason || "Compra / ingreso manual",
          },
        });

        return stockItem;
      });

      return NextResponse.json(updated);
    }

    if (action === "set_stock") {
      const newStock = Number(body.currentStock || 0);

      if (!Number.isFinite(newStock) || newStock < 0) {
        return NextResponse.json(
          { error: "El stock debe ser un número válido mayor o igual a 0." },
          { status: 400 }
        );
      }

      const difference = newStock - current.currentStock;

      const updated = await prisma.$transaction(async (tx: any) => {
        const stockItem = await tx.stockItem.update({
          where: { id },
          data: {
            currentStock: newStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            stockItemId: id,
            type: "adjustment",
            quantity: difference,
            previousStock: current.currentStock,
            newStock,
            reason: body.reason || "Ajuste manual de stock",
          },
        });

        return stockItem;
      });

      return NextResponse.json(updated);
    }

    const updated = await prisma.stockItem.update({
      where: { id },
      data: {
        name: String(body.name || current.name).trim(),
        minStock: Number(body.minStock ?? current.minStock),
        active: Boolean(body.active),
        productId: toNullableNumber(body.productId),
        modifierOptionId: toNullableNumber(body.modifierOptionId),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/beverage-stock error:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el stock de bebida." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID inválido." },
        { status: 400 }
      );
    }

    await prisma.stockItem.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/beverage-stock error:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el stock de bebida." },
      { status: 500 }
    );
  }
}
