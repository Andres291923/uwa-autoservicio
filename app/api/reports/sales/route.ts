import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getDateRange(url: string) {
  const { searchParams } = new URL(url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();

  const start = from ? new Date(`${from}T00:00:00`) : new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = to ? new Date(`${to}T23:59:59.999`) : new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getPaymentLabel(paymentMethod: string | null | undefined) {
  if (paymentMethod === "debit_credit") return "Débito / Crédito";
  if (paymentMethod === "food_benefit") return "Beneficio alimentación";
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
        const categoryName = item.product.category?.name || "Sin categoría";
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
