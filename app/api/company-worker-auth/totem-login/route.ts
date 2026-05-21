import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeRut(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .replace(/-/g, "");
}

function verifyPin(pin: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) return false;

  const storedBuffer = Buffer.from(hash, "hex");
  const attemptBuffer = scryptSync(pin, salt, 64);

  if (storedBuffer.length !== attemptBuffer.length) return false;

  return timingSafeEqual(storedBuffer, attemptBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rut = normalizeRut(body.rut);
    const pin = cleanText(body.pin);

    if (!rut) {
      return NextResponse.json(
        { error: "Ingresa RUT del trabajador." },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        { error: "Ingresa PIN rapido del trabajador." },
        { status: 400 }
      );
    }

    const workers = await prisma.companyWorker.findMany({
      include: {
        companyCustomer: true,
      },
    });

    const worker = workers.find((item) => normalizeRut(item.rut) === rut);

    if (!worker) {
      return NextResponse.json(
        { error: "Trabajador no encontrado." },
        { status: 404 }
      );
    }

    if (!worker.totemPinHash) {
      return NextResponse.json(
        {
          error:
            "Este trabajador aun no tiene PIN rapido. Debe crearlo desde su perfil.",
        },
        { status: 403 }
      );
    }

    const pinOk = verifyPin(pin, worker.totemPinHash);

    if (!pinOk) {
      return NextResponse.json(
        { error: "PIN rapido incorrecto." },
        { status: 401 }
      );
    }

    if (!worker.active) {
      return NextResponse.json(
        { error: "Este trabajador esta inactivo." },
        { status: 403 }
      );
    }

    const company: any = worker.companyCustomer;

    if (company?.active === false) {
      return NextResponse.json(
        { error: "La empresa esta inactiva." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      accountType: "company_worker_totem",
      workerId: worker.id,
      companyCustomerId: worker.companyCustomerId,
      workerName: worker.name,
      workerEmail: worker.email,
      workerRut: worker.rut,
      walletBalance: worker.walletBalance || 0,
      companyName: worker.companyCustomer.companyName,
      companyEmail: worker.companyCustomer.email,
    });
  } catch (error) {
    console.error("COMPANY_WORKER_TOTEM_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo ingresar con saldo empresa." },
      { status: 500 }
    );
  }
}
