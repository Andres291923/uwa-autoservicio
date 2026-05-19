import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(dateText: string) {
  return new Date(`${dateText}T00:00:00`);
}

function endOfDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999`);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function moneyNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function validOrder(order: any) {
  const status = String(order.status || "").toLowerCase();
  return !["cancelled", "canceled", "cancelado"].includes(status);
}

function orderPaidTotal(order: any) {
  const total = moneyNumber(order.total);
  const walletAmountUsed = moneyNumber(order.walletAmountUsed);
  const tipAmount = moneyNumber(order.tipAmount);
  return Math.max(0, total - walletAmountUsed + tipAmount);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyCustomerId = Number(body.companyCustomerId || 0);
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim();

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

    const orFilters: any[] = [
      { companyCustomerId: company.id },
    ];

    if (companyName) {
      orFilters.push({
        customerName: {
          contains: companyName,
        },
      });
    }

    const allOrders = await prisma.order.findMany({
      where: {
        OR: orFilters,
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

    const cleanOrders = allOrders.filter(validOrder);

    const filteredOrders = cleanOrders.filter((order) => {
      const createdAt = new Date(order.createdAt);

      if (startDate && createdAt < startOfDay(startDate)) return false;
      if (endDate && createdAt > endOfDay(endDate)) return false;

      return true;
    });

    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const weeklyOrders = cleanOrders.filter(
      (order) => new Date(order.createdAt) >= weekStart
    );

    const monthlyOrders = cleanOrders.filter(
      (order) => new Date(order.createdAt) >= monthStart
    );

    const totalHistorical = cleanOrders.reduce(
      (sum, order) => sum + orderPaidTotal(order),
      0
    );

    const rangeTotal = filteredOrders.reduce(
      (sum, order) => sum + orderPaidTotal(order),
      0
    );

    const weeklyTotal = weeklyOrders.reduce(
      (sum, order) => sum + orderPaidTotal(order),
      0
    );

    const monthlyTotal = monthlyOrders.reduce(
      (sum, order) => sum + orderPaidTotal(order),
      0
    );

    const averageTicket =
      cleanOrders.length > 0 ? Math.round(totalHistorical / cleanOrders.length) : 0;

    return NextResponse.json({
      company: {
        id: company.id,
        companyName: company.companyName,
        email: company.email,
        rut: company.rut,
        contactName: company.contactName,
      },
      summary: {
        rangeTotal,
        rangeOrdersCount: filteredOrders.length,
        weeklyTotal,
        weeklyOrdersCount: weeklyOrders.length,
        monthlyTotal,
        monthlyOrdersCount: monthlyOrders.length,
        totalHistorical,
        ordersCount: cleanOrders.length,
        averageTicket,
      },
      orders: filteredOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        scheduledFor: order.scheduledFor,
        status: order.status,
        paymentMethod: order.paymentMethod || "",
        totalPaid: orderPaidTotal(order),
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          productName: item.product?.name || "Producto",
          categoryName: item.product?.category?.name || "",
          total: moneyNumber(item.total),
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
    console.error("COMPANY_ORDERS_DASHBOARD_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar el reporte de pedidos empresa." },
      { status: 500 }
    );
  }
}
