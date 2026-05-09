import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IncomingOrderItem = {
  productId?: number;
  quantity?: number;
  modifierOptionIds?: number[];
};

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
          modifiers: {
            include: {
              option: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = String(body.customerName || "").trim();
    const totemCode = String(body.totemCode || "totem-local").trim();

    const items: IncomingOrderItem[] = Array.isArray(body.items)
      ? body.items
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "El pedido no tiene productos." },
        { status: 400 }
      );
    }

    const lastOrder = await prisma.order.findFirst({
      orderBy: {
        orderNumber: "desc",
      },
    });

    const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    let orderTotal = 0;

    const itemsToCreate = [];

    for (const item of items) {
      const productId = Number(item.productId || 0);
      const quantity = Number(item.quantity || 1);
      const modifierOptionIds = Array.isArray(item.modifierOptionIds)
        ? item.modifierOptionIds.map(Number).filter(Boolean)
        : [];

      if (!productId) {
        return NextResponse.json(
          { error: "Un producto del pedido no tiene ID válido." },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product || !product.active) {
        return NextResponse.json(
          { error: "Uno de los productos no existe o está inactivo." },
          { status: 400 }
        );
      }

      const modifierOptions = modifierOptionIds.length
        ? await prisma.modifierOption.findMany({
            where: {
              id: {
                in: modifierOptionIds,
              },
              active: true,
            },
          })
        : [];

      const modifiersTotal = modifierOptions.reduce(
        (sum, option) => sum + option.price,
        0
      );

      const unitPrice = product.price + modifiersTotal;
      const itemTotal = unitPrice * quantity;

      orderTotal += itemTotal;

      itemsToCreate.push({
        quantity,
        unitPrice,
        total: itemTotal,
        productId: product.id,
        modifiers: {
          create: modifierOptions.map((option) => ({
            optionId: option.id,
            price: option.price,
          })),
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        status: "pending",
        total: orderTotal,
        customerName: customerName || null,
        totemCode,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: {
                option: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo crear el pedido." },
      { status: 500 }
    );
  }
}