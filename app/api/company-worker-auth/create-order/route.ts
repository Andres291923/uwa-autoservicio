import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CartItemInput = {
  productId: number;
  quantity: number;
  modifierOptionIds?: number[];
};

function moneyNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function isActive(value: unknown) {
  return value !== false;
}

function optionExtraPrice(option: any) {
  return moneyNumber(
    option?.priceExtra ??
      option?.extraPrice ??
      option?.priceModifier ??
      option?.price ??
      0
  );
}

function groupMin(group: any) {
  return Number(group?.min ?? group?.minSelections ?? group?.minimum ?? 0);
}

function groupMax(group: any) {
  const value = Number(group?.max ?? group?.maxSelections ?? group?.maximum ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function groupRequired(group: any) {
  return Boolean(group?.required ?? group?.isRequired ?? false);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const workerId = Number(body.workerId || 0);
    const items = Array.isArray(body.items) ? (body.items as CartItemInput[]) : [];

    if (!workerId) {
      return NextResponse.json(
        { error: "Trabajador no informado." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Agrega productos al pedido." },
        { status: 400 }
      );
    }

    const worker = await prisma.companyWorker.findUnique({
      where: { id: workerId },
      include: {
        companyCustomer: true,
      },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Trabajador no encontrado." },
        { status: 404 }
      );
    }

    if (!worker.active) {
      return NextResponse.json(
        { error: "Trabajador inactivo." },
        { status: 400 }
      );
    }

    if (!worker.companyCustomer?.active) {
      return NextResponse.json(
        { error: "Empresa inactiva." },
        { status: 400 }
      );
    }

    const productIds = items.map((item) => Number(item.productId)).filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        active: true,
      },
      include: {
        category: true,
        modifierGroups: {
          include: {
            template: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product as any]));

    const orderItems = items.map((item) => {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const product = productMap.get(productId);

      if (!product) {
        throw new Error("Producto no disponible.");
      }

      const selectedOptionIds = Array.from(
        new Set((item.modifierOptionIds || []).map(Number).filter(Boolean))
      );

      const selectedOptions: {
        optionId: number;
        price: number;
        label: string;
      }[] = [];

      const groups = Array.isArray(product.modifierGroups)
        ? product.modifierGroups.filter((group: any) => isActive(group.active))
        : [];

      for (const group of groups) {
        const options = Array.isArray(group.template?.options)
          ? group.template.options.filter((option: any) => {
              return isActive(option.active) && isActive(option.available);
            })
          : [];

        const optionIdsInGroup = options.map((option: any) => Number(option.id));

        const selectedInGroup = selectedOptionIds.filter((optionId) =>
          optionIdsInGroup.includes(optionId)
        );

        const min = groupRequired(group) ? Math.max(1, groupMin(group)) : groupMin(group);
        const max = groupMax(group);

        if (min > 0 && selectedInGroup.length < min) {
          throw new Error(
            `Debes seleccionar al menos ${min} opcion(es) en ${group.template?.name || "modificador"}.`
          );
        }

        if (max > 0 && selectedInGroup.length > max) {
          throw new Error(
            `Solo puedes seleccionar ${max} opcion(es) en ${group.template?.name || "modificador"}.`
          );
        }

        for (const optionId of selectedInGroup) {
          const option = options.find((item: any) => Number(item.id) === optionId);

          if (!option) {
            throw new Error("Una opcion seleccionada ya no esta disponible.");
          }

          selectedOptions.push({
            optionId: Number(option.id),
            price: optionExtraPrice(option),
            label: option.name || "Opcion",
          });
        }
      }

      const unitPrice =
        moneyNumber(product.price) +
        selectedOptions.reduce((sum, option) => sum + option.price, 0);

      const total = unitPrice * quantity;

      return {
        productId,
        quantity,
        unitPrice,
        total,
        productName: product.name || "Producto",
        selectedOptions,
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.total, 0);

    if (total <= 0) {
      return NextResponse.json(
        { error: "Total invalido." },
        { status: 400 }
      );
    }

    if ((worker.walletBalance || 0) < total) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Tu saldo es ${worker.walletBalance || 0} y el pedido cuesta ${total}.`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        orderBy: {
          orderNumber: "desc",
        },
        select: {
          orderNumber: true,
        },
      });

      const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

      const updatedWorker = await tx.companyWorker.update({
        where: { id: worker.id },
        data: {
          walletBalance: {
            decrement: total,
          },
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          customerName: worker.companyCustomer.companyName,
          customerComment: `Trabajador: ${worker.name}`,
          total,
          subtotalAmount: total,
          walletAmountUsed: total,
          paymentMethod: "worker_wallet",
          orderSource: "company_worker",
          fulfillmentType: "immediate",
          companyCustomerId: worker.companyCustomerId,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              modifiers: {
                create: item.selectedOptions.map((option) => ({
                  optionId: option.optionId,
                  price: option.price,
                })),
              },
            })),
          },
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

      const workerTransaction = await tx.companyWorkerWalletTransaction.create({
        data: {
          companyWorkerId: worker.id,
          companyCustomerId: worker.companyCustomerId,
          type: "debit",
          amount: total,
          workerBalanceAfter: updatedWorker.walletBalance,
          companyBalanceAfter: worker.companyCustomer.walletBalance || 0,
          reason: `Compra pedido #${nextOrderNumber}`,
          source: "worker_order_payment",
        },
      });

      return {
        order,
        worker: updatedWorker,
        workerTransaction,
      };
    });

    return NextResponse.json({
      ok: true,
      order: result.order,
      worker: {
        id: result.worker.id,
        walletBalance: result.worker.walletBalance,
      },
    });
  } catch (error) {
    console.error("COMPANY_WORKER_CREATE_ORDER_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear pedido trabajador.",
      },
      { status: 500 }
    );
  }
}
