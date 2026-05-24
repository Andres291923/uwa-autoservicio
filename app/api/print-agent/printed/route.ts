import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  try {
    const auth = validateAgent(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.orderId || body.id);
    const agentId =
      String(body.agentId || request.headers.get("x-print-agent-id") || "").trim() ||
      "cocina-principal";

    if (!orderId) {
      return NextResponse.json(
        { error: "Falta orderId." },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        printStatus: "printed",
        printedAt: new Date(),
        printCount: {
          increment: 1,
        },
        claimedAt: null,
        printAgentId: agentId,
        lastPrintError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      printStatus: order.printStatus,
      printCount: order.printCount,
    });
  } catch (error) {
    console.error("PRINT_AGENT_PRINTED_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo marcar la comanda como impresa." },
      { status: 500 }
    );
  }
}
