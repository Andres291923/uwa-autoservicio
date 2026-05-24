import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
}

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

function getDateRange(url: string) {
  const { searchParams } = new URL(url);

  const now = new Date();
  const chileToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const from = searchParams.get("from") || chileToday;
  const to = searchParams.get("to") || chileToday;

  return {
    start: chileDateToUtc(from, false),
    end: chileDateToUtc(to, true),
  };
}

function getPaymentLabel(paymentMethod: string | null | undefined) {
  if (paymentMethod === "debit_credit") return "Débito / Crédito";
  if (paymentMethod === "food_benefit") return "Beneficio alimentación";
  if (paymentMethod === "bank_transfer") return "Transferencia";
  if (paymentMethod === "mercado_pago") return "Mercado Pago";
  if (paymentMethod === "online") return "Online";
  if (paymentMethod === "worker_wallet") return "Saldo trabajador";
  return "No informado";
}

export async function GET(request: Request) {
  try {
    const { start, end } = getDateRange(request.url);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          not: "cancelled",
        },
      },
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

    const paymentMap = new Map<
      string,
      {
        paymentMethod: string;
        label: string;
        orders: number;
        total: number;
      }
    >();

    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        quantity: number;
        total: number;
        orders: Set<number>;
      }
    >();

    const productMap = new Map<
      string,
      {
        productName: string;
        categoryName: string;
        quantity: number;
        total: number;
      }
    >();

    const modifierMap = new Map<
      string,
      {
        groupName: string;
        optionName: string;
        quantity: number;
        totalExtra: number;
      }
    >();

    const bowlModifierMap = new Map<
      string,
      {
        groupName: string;
        optionName: string;
        quantity: number;
        totalExtra: number;
      }
    >();

    let totalSales = 0;
    let totalRevenue = 0;
    let totalItems = 0;

    for (const order of orders) {
      totalSales += 1;
      totalRevenue += order.total;

      const paymentKey = order.paymentMethod || "unknown";

      const currentPayment = paymentMap.get(paymentKey) || {
        paymentMethod: paymentKey,
        label: getPaymentLabel(paymentKey),
        orders: 0,
        total: 0,
      };

      currentPayment.orders += 1;
      currentPayment.total += order.total;

      paymentMap.set(paymentKey, currentPayment);

      for (const item of order.items) {
        const quantity = item.quantity;
        const itemTotal = item.total;
        const categoryName = item.product.category?.name || "Sin categorÃ­a";
        const productName = item.product.name;

        totalItems += quantity;

        const categoryCurrent = categoryMap.get(categoryName) || {
          categoryName,
          quantity: 0,
          total: 0,
          orders: new Set<number>(),
        };

        categoryCurrent.quantity += quantity;
        categoryCurrent.total += itemTotal;
        categoryCurrent.orders.add(order.id);

        categoryMap.set(categoryName, categoryCurrent);

        const productKey = `${categoryName}::${productName}`;

        const productCurrent = productMap.get(productKey) || {
          productName,
          categoryName,
          quantity: 0,
          total: 0,
        };

        productCurrent.quantity += quantity;
        productCurrent.total += itemTotal;

        productMap.set(productKey, productCurrent);

        const isBowl =
          categoryName.toLowerCase().includes("bowl") ||
          productName.toLowerCase().includes("bowl");

        for (const modifier of item.modifiers) {
          const groupName = modifier.option.template?.name || "Modificador";
          const optionName = modifier.option.name;
          const key = `${groupName}::${optionName}`;

          const modifierCurrent = modifierMap.get(key) || {
            groupName,
            optionName,
            quantity: 0,
            totalExtra: 0,
          };

          modifierCurrent.quantity += quantity;
          modifierCurrent.totalExtra += modifier.price * quantity;

          modifierMap.set(key, modifierCurrent);

          if (isBowl) {
            const bowlCurrent = bowlModifierMap.get(key) || {
              groupName,
              optionName,
              quantity: 0,
              totalExtra: 0,
            };

            bowlCurrent.quantity += quantity;
            bowlCurrent.totalExtra += modifier.price * quantity;

            bowlModifierMap.set(key, bowlCurrent);
          }
        }
      }
    }

    const categories = Array.from(categoryMap.values())
      .map((item) => ({
        categoryName: item.categoryName,
        quantity: item.quantity,
        orders: item.orders.size,
        total: item.total,
      }))
      .sort((a, b) => b.total - a.total);

    const products = Array.from(productMap.values()).sort(
      (a, b) => b.quantity - a.quantity
    );

    const modifiers = Array.from(modifierMap.values()).sort(
      (a, b) => b.quantity - a.quantity
    );

    const bowlDetails = Array.from(bowlModifierMap.values()).sort(
      (a, b) => b.quantity - a.quantity
    );

    return NextResponse.json({
      range: {
        from: start.toISOString(),
        to: end.toISOString(),
      },
      summary: {
        totalSales,
        totalRevenue,
        totalItems,
        averageTicket:
          totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
      },
      payments: Array.from(paymentMap.values()).sort(
        (a, b) => b.total - a.total
      ),
      categories,
      products,
      modifiers,
      bowlDetails,
      orders,
    });
  } catch (error) {
    console.error("SALES_REPORT_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo generar el reporte de ventas." },
      { status: 500 }
    );
  }
}
