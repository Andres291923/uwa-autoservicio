import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const orderInclude = {
  customer: true,
  companyCustomer: true,
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
};

function getExpectedApprovalKey() {
  return String(
    process.env.COMPANY_ORDER_APPROVAL_KEY ||
      process.env.KITCHEN_APPROVAL_KEY ||
      process.env.ADMIN_PASSWORD ||
      ""
  ).trim();
}

function safeCompare(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

function isCompanyOrder(order: {
  orderSource: string | null;
  paymentMethod: string | null;
  companyCustomerId: number | null;
}) {
  return (
    order.orderSource === "company" ||
    order.paymentMethod === "bank_transfer" ||
    Boolean(order.companyCustomerId)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const orderId = Number(body.orderId || body.id);
    const approvalKey = String(body.approvalKey || body.key || "").trim();
    const expectedApprovalKey = getExpectedApprovalKey();

    if (!orderId) {
      return NextResponse.json(
        { error: "Falta el ID del pedido." },
        { status: 400 }
      );
    }

    if (!expectedApprovalKey) {
      return NextResponse.json(
        {
          error:
            "No existe clave configurada. Configura COMPANY_ORDER_APPROVAL_KEY, KITCHEN_APPROVAL_KEY o ADMIN_PASSWORD.",
        },
        { status: 500 }
      );
    }

    if (!approvalKey) {
      return NextResponse.json(
        { error: "Ingresa la clave de autorización." },
        { status: 400 }
      );
    }

    if (!safeCompare(approvalKey, expectedApprovalKey)) {
      return NextResponse.json(
        { error: "Clave incorrecta." },
        { status: 401 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        status: true,
        orderSource: true,
        paymentMethod: true,
        companyCustomerId: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (!isCompanyOrder(existingOrder)) {
      return NextResponse.json(
        { error: "Este pedido no corresponde a empresa." },
        { status: 400 }
      );
    }

    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Este pedido ya no está pendiente." },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: "ready",
        printStatus: "printed",
        printedAt: new Date(),
        printCount: {
          increment: 1,
        },
        claimedAt: null,
        printAgentId: "manual-cocina",
        lastPrintError: null,
      },
      include: orderInclude,
    });

    return NextResponse.json({
      ok: true,
      order,
    });
  } catch (error) {
    console.error("APPROVE_COMPANY_ORDER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo aprobar el pedido empresa." },
      { status: 500 }
    );
  }
}
