import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateWalletBreakdown } from "@/lib/wallet";

const allowedStatuses = ["pending", "ready", "cancelled"];
const storeTimeZone = "America/Santiago";

function getChileDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: storeTimeZone,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getChileMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: storeTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

async function isStoreOpenNow() {
  const now = new Date();
  const dayOfWeek = getChileDayOfWeek(now);
  const currentMinutes = getChileMinutes(now);

  const schedule = await prisma.storeOpeningHour.findUnique({
    where: {
      businessSettingsId_dayOfWeek: {
        businessSettingsId: 1,
        dayOfWeek,
      },
    },
  });

  if (!schedule || !schedule.enabled) return false;

  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function normalizePaymentMethod(value: unknown) {
  if (value === "debit_credit") return "debit_credit";
  if (value === "food_benefit") return "food_benefit";
  if (value === "online") return "online";
  return "unknown";
}

function normalizeOrderSource(value: unknown) {
  if (value === "online") return "online";
  return "totem";
}

function normalizeFulfillmentType(value: unknown) {
  if (value === "scheduled") return "scheduled";
  return "immediate";
}

function normalizeCouponCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseIds(value: string | null | undefined) {
  if (!value || value === "all") return [];

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter(Boolean);
}

function calculateBalance(transactions: { type: string; amount: number }[]) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type === "credit") return sum + transaction.amount;
    if (transaction.type === "debit") return sum - transaction.amount;
    return sum;
  }, 0);
}

async function calculateCashback(params: {
  customerId: number | null;
  paymentMethod: string;
  orderTotal: number;
  walletAmountUsed: number;
  itemsMeta: {
    productId: number;
    categoryId: number | null;
    lineTotal: number;
  }[];
}) {
  const { customerId, paymentMethod, walletAmountUsed, itemsMeta } = params;

  if (!customerId) {
    return { cashbackEarned: 0, expiresAt: null as Date | null };
  }

  const now = new Date();

  const rules = await prisma.cashbackRule.findMany({
    where: {
      active: true,
    },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });

  const rule = rules.find((item) => {
    const startsOk = !item.startDate || item.startDate <= now;
    const endsOk = !item.endDate || item.endDate >= now;
    const paymentOk =
      item.allowedPaymentMethods === "all" ||
      item.allowedPaymentMethods === paymentMethod;

    return startsOk && endsOk && paymentOk;
  });

  if (!rule) {
    return { cashbackEarned: 0, expiresAt: null as Date | null };
  }

  const includedCategoryIds =
    rule.includedCategoryIds === "all"
      ? []
      : parseIds(rule.includedCategoryIds);

  const excludedProductIds = parseIds(rule.excludedProductIds);

  const eligibleItemsTotal = itemsMeta
    .filter((item) => {
      const categoryOk =
        rule.includedCategoryIds === "all" ||
        includedCategoryIds.includes(item.categoryId || 0);

      const productOk = !excludedProductIds.includes(item.productId);

      return categoryOk && productOk;
    })
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const eligibleAmount = Math.max(0, eligibleItemsTotal - walletAmountUsed);

  if (eligibleAmount <= 0) {
    return { cashbackEarned: 0, expiresAt: null as Date | null };
  }

  if (eligibleAmount < rule.minPurchase) {
    return { cashbackEarned: 0, expiresAt: null as Date | null };
  }

  let cashbackEarned = Math.round(
    eligibleAmount * (Number(rule.cashbackPercent) / 100)
  );

  if (rule.maxCashback > 0) {
    cashbackEarned = Math.min(cashbackEarned, rule.maxCashback);
  }

  if (cashbackEarned <= 0) {
    return { cashbackEarned: 0, expiresAt: null as Date | null };
  }

  let expiresAt: Date | null = null;

  if (rule.validityDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rule.validityDays);
  }

  return { cashbackEarned, expiresAt };
}


function getScheduledChileDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getScheduledChileMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

function scheduleTimeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

async function validateScheduledOrderTime(date: Date) {
  const dayOfWeek = getScheduledChileDayOfWeek(date);
  const scheduledMinutes = getScheduledChileMinutes(date);

  const schedule = await prisma.storeOpeningHour.findUnique({
    where: {
      businessSettingsId_dayOfWeek: {
        businessSettingsId: 1,
        dayOfWeek,
      },
    },
  });

  if (!schedule || !schedule.enabled) {
    return {
      ok: false,
      openTime: null,
      closeTime: null,
    };
  }

  const openMinutes = scheduleTimeToMinutes(schedule.openTime);
  const closeMinutes = scheduleTimeToMinutes(schedule.closeTime);

  return {
    ok: scheduledMinutes >= openMinutes && scheduledMinutes < closeMinutes,
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
  };
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
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

    const customerId = body.customerId ? Number(body.customerId) : null;

    const customerName = body.customerName
      ? String(body.customerName).trim()
      : null;

    const customerComment = body.customerComment
      ? String(body.customerComment).trim().slice(0, 500)
      : null;

    const totemCode = body.totemCode ? String(body.totemCode) : "totem-local";
    const paymentMethod = normalizePaymentMethod(body.paymentMethod);
    const orderSource = normalizeOrderSource(body.orderSource);
    const fulfillmentType = normalizeFulfillmentType(body.fulfillmentType);
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    const requestedDiscountCouponCode = normalizeCouponCode(
      body.discountCouponCode || body.couponCode
    );

    const requestedWalletAmount = Math.max(
      0,
      Math.round(Number(body.walletAmountUsed || 0))
    );

    const tipAmount = Math.max(
      0,
      Math.round(Number(body.tipAmount || 0))
    );

    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "El pedido no tiene productos." },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio." },
        { status: 400 }
      );
    }

    if (fulfillmentType === "scheduled" && !scheduledFor) {
      return NextResponse.json(
        { error: "Falta fecha u hora programada." },
        { status: 400 }
      );
    }


    if (fulfillmentType !== "scheduled") {
      const storeIsOpen = await isStoreOpenNow();

      if (!storeIsOpen) {
        return NextResponse.json(
          {
            error:
              "STORE_CLOSED_FOR_IMMEDIATE_ORDER: Tienda cerrada, solo puedes hacer pedidos programados.",
          },
          { status: 400 }
        );
      }
    }

    if (fulfillmentType === "scheduled" && scheduledFor) {
      const scheduledValidation = await validateScheduledOrderTime(scheduledFor);

      if (!scheduledValidation.ok) {
        const hoursText =
          scheduledValidation.openTime && scheduledValidation.closeTime
            ? `Horario disponible: ${scheduledValidation.openTime} a ${scheduledValidation.closeTime}.`
            : "La tienda no abre ese dia.";

        return NextResponse.json(
          {
            error:
              `STORE_CLOSED_FOR_SCHEDULED_ORDER: La tienda esta cerrada en ese horario. ${hoursText}`,
          },
          { status: 400 }
        );
      }
    }
    const customer = customerId
      ? await prisma.customer.findUnique({
          where: {
            id: customerId,
          },
          include: {
            walletTransactions: true,
          },
        })
      : null;

    if (customerId && (!customer || !customer.active)) {
      return NextResponse.json(
        { error: "Cliente no encontrado o inactivo." },
        { status: 400 }
      );
    }

    const lastOrder = await prisma.order.findFirst({
      orderBy: {
        orderNumber: "desc",
      },
    });

    const orderNumber = (lastOrder?.orderNumber || 0) + 1;

    const orderItemsData: any[] = [];
    const itemsMeta: {
      productId: number;
      categoryId: number | null;
      lineTotal: number;
    }[] = [];

    let orderTotal = 0;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Number(item.quantity || 1));

      const modifierOptionIds = Array.isArray(item.modifierOptionIds)
        ? item.modifierOptionIds
            .map((id: unknown) => Number(id))
            .filter(Boolean)
        : [];

      if (!productId) {
        return NextResponse.json(
          { error: "Producto invalido en el pedido." },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
        include: {
          category: true,
        },
      });

      if (!product || !product.active) {
        return NextResponse.json(
          { error: "Uno de los productos no esta disponible." },
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

      itemsMeta.push({
        productId: product.id,
        categoryId: product.categoryId || null,
        lineTotal,
      });

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

    const subtotalAmount = orderTotal;
    let discountAmount = 0;
    let discountPercent = 0;
    let discountCouponCode: string | null = null;

    if (orderSource === "online" && requestedDiscountCouponCode) {
      const coupon = await prisma.discountCoupon.findUnique({
        where: {
          code: requestedDiscountCouponCode,
        },
      });

      if (!coupon || !coupon.active) {
        return NextResponse.json(
          { error: "Cupón inválido o inactivo." },
          { status: 400 }
        );
      }

      discountPercent = Math.max(1, Math.min(100, coupon.percent));
      discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
      discountCouponCode = coupon.code;
    }

    const totalAfterDiscount = Math.max(0, subtotalAmount - discountAmount);

    const walletBalance = customer
      ? calculateWalletBreakdown(customer.walletTransactions).totalBalance
      : 0;

    const walletAmountUsed = customer
      ? Math.min(requestedWalletAmount, walletBalance, totalAfterDiscount)
      : 0;

    const { cashbackEarned, expiresAt } = await calculateCashback({
      customerId,
      paymentMethod,
      orderTotal: totalAfterDiscount,
      walletAmountUsed,
      itemsMeta,
    });

    const order = await prisma.$transaction(async (tx) => {
      const orderData: any = {
        orderNumber,
        status: "pending",
        total: totalAfterDiscount,
        subtotalAmount,
        discountAmount,
        discountPercent,
        discountCouponCode,
        customerName,
        customerComment,
        walletAmountUsed,
        cashbackEarned,
        tipAmount,
        totemCode,
        paymentMethod,
        orderSource,
        fulfillmentType,
        scheduledFor,
        items: {
          create: orderItemsData,
        },
      };

      if (customerId) {
        orderData.customer = {
          connect: {
            id: customerId,
          },
        };
      }

      const createdOrder = await tx.order.create({
        data: orderData,
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

      if (customerId && walletAmountUsed > 0) {
        await tx.walletTransaction.create({
          data: {
            customer: {
              connect: {
                id: customerId,
              },
            },
            type: "debit",
            amount: walletAmountUsed,
            reason: `Uso de saldo en pedido #${orderNumber}`,
            source: "wallet_spend",
          },
        });
      }

      if (customerId && cashbackEarned > 0) {
        const cashbackTransactionData: any = {
          customer: {
            connect: {
              id: customerId,
            },
          },
          type: "credit",
          amount: cashbackEarned,
          reason: `Cashback pedido #${orderNumber}`,
            source: "cashback",
            expiresAt,
        };

        await tx.walletTransaction.create({
          data: cashbackTransactionData,
        });
      }

      return createdOrder;
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
        { error: "Estado de pedido invalido." },
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

    return NextResponse.json(order);
  } catch (error) {
    console.error("UPDATE_ORDER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el pedido." },
      { status: 500 }
    );
  }
}





