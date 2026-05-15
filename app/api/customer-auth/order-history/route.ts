import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerId = Number(body.customerId || 0);

    if (!customerId) {
      return NextResponse.json(
        { error: "Falta cliente." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
          include: {
            items: {
              include: {
                product: true,
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
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      orders: customer.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        subtotalAmount: order.subtotalAmount || order.total,
        discountAmount: order.discountAmount || 0,
        discountPercent: order.discountPercent || 0,
        discountCouponCode: order.discountCouponCode || "",
        tipAmount: order.tipAmount || 0,
        walletAmountUsed: order.walletAmountUsed || 0,
        cashbackEarned: order.cashbackEarned || 0,
        paymentMethod: order.paymentMethod,
        orderSource: order.orderSource,
        fulfillmentType: order.fulfillmentType,
        scheduledFor: order.scheduledFor,
        customerComment: order.customerComment || "",
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          productName: item.product.name,
          modifiers: item.modifiers.map((modifier) => ({
            id: modifier.id,
            groupName: modifier.option.template?.name || "Modificador",
            optionName: modifier.option.name,
            price: modifier.price,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error("CUSTOMER_ORDER_HISTORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar el historial de pedidos." },
      { status: 500 }
    );
  }
}
