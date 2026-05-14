import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatOrderSource(value: string | null | undefined) {
  if (value === "online") return "Web";
  if (value === "totem") return "Tótem";
  return "Tótem";
}

function formatPaymentMethod(value: string | null | undefined) {
  if (value === "debit_credit") return "Débito / Crédito";
  if (value === "food_benefit") return "Beneficio alimentación";
  if (value === "online") return "Online";
  return "Sin definir";
}

function startOfDay(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  return date;
}

function endOfDay(dateText: string) {
  const date = new Date(`${dateText}T23:59:59.999`);
  return date;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = String(searchParams.get("q") || "").trim();
    const startDate = String(searchParams.get("startDate") || "").trim();
    const endDate = String(searchParams.get("endDate") || "").trim();

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        where.createdAt.gte = startOfDay(startDate);
      }

      if (endDate) {
        where.createdAt.lte = endOfDay(endDate);
      }
    }

    if (q) {
      const orderNumber = Number(q.replace("#", ""));

      where.OR = [
        {
          customerName: {
            contains: q,
          },
        },
      ];

      if (!Number.isNaN(orderNumber) && orderNumber > 0) {
        where.OR.push({
          orderNumber,
        });
      }
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
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

    const rows = orders.map((order) => {
      const tipAmount = 0;
      const walletAmountUsed = order.walletAmountUsed || 0;
      const totalPaid = Math.max(0, order.total - walletAmountUsed + tipAmount);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customer?.name || order.customerName || "Sin nombre",
        purchaseAmount: order.total,
        tipAmount,
        totalPaid,
        walletAmountUsed,
        paymentMethod: formatPaymentMethod(order.paymentMethod),
        orderSource: formatOrderSource(order.orderSource),
        status: order.status,
        detail: order.items.map((item) => ({
          productName: item.product?.name || "Producto",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          categoryName: item.product?.category?.name || "",
          modifiers: item.modifiers.map((modifier) => ({
            groupName: modifier.option?.template?.name || "Modificador",
            optionName: modifier.option?.name || "Opción",
            price: modifier.price,
          })),
        })),
      };
    });

    const summary = {
      totalOrders: rows.length,
      totalPurchaseAmount: rows.reduce((sum, row) => sum + row.purchaseAmount, 0),
      totalTips: rows.reduce((sum, row) => sum + row.tipAmount, 0),
      totalPaid: rows.reduce((sum, row) => sum + row.totalPaid, 0),
      totalWalletUsed: rows.reduce((sum, row) => sum + row.walletAmountUsed, 0),
    };

    return NextResponse.json({
      rows,
      summary,
    });
  } catch (error) {
    console.error("REPORT_ORDERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar el reporte de pedidos." },
      { status: 500 }
    );
  }
}
