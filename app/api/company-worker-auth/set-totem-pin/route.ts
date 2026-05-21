import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const workerId = Number(body.workerId || 0);
    const pin = cleanText(body.pin);

    if (!workerId) {
      return NextResponse.json(
        { error: "Trabajador no informado." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "El PIN debe tener exactamente 4 numeros." },
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
        { status: 403 }
      );
    }

    if (worker.companyCustomer?.active === false) {
      return NextResponse.json(
        { error: "Empresa inactiva." },
        { status: 403 }
      );
    }

    await prisma.companyWorker.update({
      where: { id: workerId },
      data: {
        totemPinHash: hashPin(pin),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "PIN rapido guardado correctamente.",
    });
  } catch (error) {
    console.error("SET_WORKER_TOTEM_PIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo guardar PIN rapido." },
      { status: 500 }
    );
  }
}
