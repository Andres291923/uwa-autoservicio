import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const allowedStatuses = ["pending", "ready", "cancelled"];

function normalizePaymentMethod(value: unknown) {
  if (value === "debit_credit") return "debit_credit";
  if (value === "food_benefit") return "food_benefit";
  return "unknown";
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                option: {
                  include: {
                    template: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET_ORDERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = body.customerName
      ? String(body.customerName).trim()
      : null;

    const totemCode = body.totemCode ? String(body.totemCode) : "totem-local";
    const paymentMethod = normalizePaymentMethod(body.paymentMethod);

    const items = Array.isArray(body.items) ? body.items : [];

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

    const orderNumber = (lastOrder?.orderNumber || 0) + 1;

    const orderItemsData = [];
    let orderTotal = 0;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity || 1);

      const modifierOptionIds = Array.isArray(item.modifierOptionIds)
        ? item.modifierOptionIds
            .map((id: unknown) => Number(id))
            .filter(Boolean)
        : [];

      if (!productId) {
        return NextResponse.json(
          { error: "Producto inválido en el pedido." },
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
          { error: "Uno de los productos no está disponible." },
          { status: 400 }
        );
      }

      const selectedOptions =
        modifierOptionIds.length > 0
          ? await prisma.modifierOption.findMany({
              where: {
                id: {
                  in: modifierOptionIds,
                },
                active: true,
              },
            })
          : [];

      const modifiersTotal = selectedOptions.reduce(
        (sum, option) => sum + option.price,
        0
      );

      const unitTotal = product.price + modifiersTotal;
      const lineTotal = unitTotal * quantity;

      orderTotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        quantity,
        unitPrice: product.price,
        total: lineTotal,
        modifiers: {
          create: selectedOptions.map((option) => ({
            optionId: option.id,
            price: option.price,
          })),
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "pending",
        total: orderTotal,
        customerName,
        totemCode,
        paymentMethod,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                option: {
                  include: {
                    template: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("CREATE_ORDER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear el pedido." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const status = String(body.status || "");

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del pedido." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Estado de pedido inválido." },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                option: {
                  include: {
                    template: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("UPDATE_ORDER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el pedido." },
      { status: 500 }
    );
  }
}
