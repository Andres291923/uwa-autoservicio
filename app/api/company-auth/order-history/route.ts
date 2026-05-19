import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function moneyNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function validOrder(order: any) {
  const status = String(order.status || "").toLowerCase();
  return !["cancelled", "canceled", "cancelado"].includes(status);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyCustomerId = Number(body.companyCustomerId || body.customerId || 0);

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    const companyName = String(company.companyName || "").trim();

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { companyCustomerId: company.id },
          {
            customerName: {
              contains: companyName,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
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
    });

    const cleanOrders = orders.filter(validOrder);

    return NextResponse.json({
      orders: cleanOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: moneyNumber(order.total),
        subtotalAmount: moneyNumber(order.subtotalAmount || order.total),
        discountAmount: moneyNumber(order.discountAmount),
        discountPercent: moneyNumber(order.discountPercent),
        discountCouponCode: order.discountCouponCode || "",
        tipAmount: moneyNumber(order.tipAmount),
        walletAmountUsed: moneyNumber(order.walletAmountUsed),
        cashbackEarned: 0,
        paymentMethod: order.paymentMethod || "",
        orderSource: order.orderSource || "company",
        fulfillmentType: order.fulfillmentType || "",
        scheduledFor: order.scheduledFor,
        customerComment: order.customerComment || "",
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: moneyNumber(item.unitPrice),
          total: moneyNumber(item.total),
          productName: item.product?.name || "Producto",
          modifiers: item.modifiers.map((modifier) => ({
            id: modifier.id,
            groupName: modifier.option?.template?.name || "Modificador",
            optionName: modifier.option?.name || "Opcion",
            price: moneyNumber(modifier.price),
          })),
        })),
      })),
    });
  } catch (error) {
    console.error("COMPANY_ORDER_HISTORY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar historial de pedidos empresa." },
      { status: 500 }
    );
  }
}
