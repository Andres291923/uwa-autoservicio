import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatOrderSource(value: string | null | undefined) {
  if (value === "online") return "Online";
  if (value === "company") return "Empresa";
  if (value === "company_worker") return "Trabajador empresa";
  if (value === "company_worker_totem") return "Trabajador empresa tótem";
  if (value === "mercado_pago") return "Mercado Pago";
  if (value === "totem") return "Tótem";
  return "Tótem";
}

function formatPaymentMethod(value: string | null | undefined) {
  if (value === "debit_credit") return "Débito / Crédito";
  if (value === "food_benefit") return "Beneficio alimentación";
  if (value === "bank_transfer") return "Transferencia";
  if (value === "online") return "Online";
  if (value === "mercado_pago") return "Mercado Pago";
  if (value === "worker_wallet") return "Saldo trabajador";
  return "Sin definir";
}

function chileDateToUtcRange(dateText: string, endOfDay = false) {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";

  const utcGuess = new Date(`${dateText}T${time}Z`);

  const chileParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);

  const get = (type: string) =>
    Number(chileParts.find((part) => part.type === type)?.value || 0);

  const chileAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
    endOfDay ? 999 : 0
  );

  const desiredAsUtc = Date.UTC(
    Number(dateText.slice(0, 4)),
    Number(dateText.slice(5, 7)) - 1,
    Number(dateText.slice(8, 10)),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );

  const offsetMs = chileAsUtc - utcGuess.getTime();

  return new Date(desiredAsUtc - offsetMs);
}T23:59:59.999`);
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
        where.createdAt.gte = chileDateToUtcRange(startDate, false);
      }

      if (endDate) {
        where.createdAt.lte = chileDateToUtcRange(endDate, true);
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
      const tipAmount = order.tipAmount || 0;
      const walletAmountUsed = order.walletAmountUsed || 0;
      const totalPaid = Math.max(0, order.total - walletAmountUsed + tipAmount);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customer?.name || order.customerName || "Sin nombre",
        purchaseAmount: order.subtotalAmount || order.total,
        discountAmount: order.discountAmount || 0,
        discountPercent: order.discountPercent || 0,
        discountCouponCode: order.discountCouponCode || "",
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
      totalDiscounts: rows.reduce((sum, row) => sum + row.discountAmount, 0),
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


