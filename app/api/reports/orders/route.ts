import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHILE_TZ = "America/Santiago";

function getChileOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const tz = parts.find((part) => part.type === "timeZoneName")?.value || "GMT-4";
  const match = tz.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);

  if (!match) return -4 * 60 * 60 * 1000;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const sign = hours < 0 ? -1 : 1;

  return (hours * 60 + sign * minutes) * 60 * 1000;
}

function chileDateToUtc(dateText: string, endOfDay = false) {
  const year = Number(dateText.slice(0, 4));
  const month = Number(dateText.slice(5, 7)) - 1;
  const day = Number(dateText.slice(8, 10));

  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  const ms = endOfDay ? 999 : 0;

  const utcGuess = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
  const offsetMs = getChileOffsetMs(utcGuess);

  return new Date(utcGuess.getTime() - offsetMs);
}

function formatOrderSource(value: string | null | undefined) {
  if (value === "online") return "Online";
  if (value === "company") return "Empresa";
  if (value === "company_worker") return "Trabajador empresa";
  if (value === "company_worker_totem") return "Trabajador empresa tótem";
  if (value === "totem") return "Tótem";
  return "Tótem";
}

function formatPaymentMethod(value: string | null | undefined) {
  if (value === "debit_credit") return "Débito / Crédito";
  if (value === "food_benefit") return "Beneficio alimentación";
  if (value === "bank_transfer") return "Transferencia";
  if (value === "mercado_pago") return "Mercado Pago";
  if (value === "online") return "Online";
  if (value === "worker_wallet") return "Saldo trabajador";
  return "Sin definir";
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
        where.createdAt.gte = chileDateToUtc(startDate, false);
      }

      if (endDate) {
        where.createdAt.lte = chileDateToUtc(endDate, true);
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
