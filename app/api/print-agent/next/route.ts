import { NextResponse } from "next/server";
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

function validateAgent(request: Request) {
  const expectedToken = String(process.env.PRINT_AGENT_TOKEN || "").trim();

  if (!expectedToken) {
    return {
      ok: false,
      error: "PRINT_AGENT_TOKEN no configurado en el servidor.",
    };
  }

  const headerToken = String(request.headers.get("x-print-agent-token") || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (headerToken !== expectedToken && bearerToken !== expectedToken) {
    return {
      ok: false,
      error: "Token de agente invalido.",
    };
  }

  return {
    ok: true,
    error: "",
  };
}

export async function GET(request: Request) {
  try {
    const auth = validateAgent(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const agentId =
      String(request.headers.get("x-print-agent-id") || "").trim() ||
      "cocina-principal";

    const now = new Date();
    const staleClaimDate = new Date(Date.now() - 90 * 1000);
    const includeBankTransfer =
      process.env.PRINT_AGENT_INCLUDE_BANK_TRANSFER === "true";

    const where: any = {
      status: "pending",
      OR: [
        { printStatus: "pending" },
        { printStatus: "error" },
        {
          printStatus: "printing",
          claimedAt: {
            lt: staleClaimDate,
          },
        },
      ],
    };

    // Seguridad: por defecto no autoimprime pedidos por transferencia bancaria.
    // Si despues quieres imprimir transferencia automaticamente, cambia
    // PRINT_AGENT_INCLUDE_BANK_TRANSFER=true
    if (!includeBankTransfer) {
      where.NOT = [{ paymentMethod: "bank_transfer" }];
    }

    const candidates = await prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "asc",
      },
      take: 5,
      include: orderInclude,
    });

    for (const candidate of candidates) {
      const lockWhere: any = {
        id: candidate.id,
        status: "pending",
        OR: where.OR,
      };

      if (!includeBankTransfer) {
        lockWhere.NOT = [{ paymentMethod: "bank_transfer" }];
      }

      const claimed = await prisma.order.updateMany({
        where: lockWhere,
        data: {
          printStatus: "printing",
          claimedAt: now,
          printAgentId: agentId,
          lastPrintError: null,
        },
      });

      if (claimed.count === 1) {
        const order = await prisma.order.findUnique({
          where: {
            id: candidate.id,
          },
          include: orderInclude,
        });

        return NextResponse.json({
          order,
        });
      }
    }

    return NextResponse.json({
      order: null,
    });
  } catch (error) {
    console.error("PRINT_AGENT_NEXT_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo obtener la siguiente comanda." },
      { status: 500 }
    );
  }
}
