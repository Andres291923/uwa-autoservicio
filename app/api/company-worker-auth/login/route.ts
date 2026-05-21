import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const attemptedBuffer = scryptSync(password, salt, 64);

  if (hashBuffer.length !== attemptedBuffer.length) return false;

  return timingSafeEqual(hashBuffer, attemptedBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(body.email);
    const password = cleanText(body.password);

    if (!email) {
      return NextResponse.json({ error: "Ingresa correo del trabajador." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Ingresa clave del trabajador." }, { status: 400 });
    }

    const workers = await prisma.companyWorker.findMany({
      include: { companyCustomer: true },
    });

    const worker = workers.find((item) => normalizeEmail(item.email) === email);

    if (!worker) {
      return NextResponse.json({ error: "Trabajador no encontrado." }, { status: 404 });
    }

    if (!worker.passwordHash) {
      return NextResponse.json({ error: "Primero debes crear tu clave." }, { status: 403 });
    }

    if (!verifyPassword(password, worker.passwordHash)) {
      return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
    }

    if (!worker.active) {
      return NextResponse.json({ error: "Este trabajador esta inactivo." }, { status: 403 });
    }

    if (!worker.companyCustomer?.active) {
      return NextResponse.json({ error: "La empresa esta inactiva." }, { status: 403 });
    }

    return NextResponse.json({
      accountType: "worker",
      workerId: worker.id,
      companyCustomerId: worker.companyCustomerId,
      name: worker.name,
      email: worker.email || email,
      rut: worker.rut,
      walletBalance: worker.walletBalance || 0,
      companyName: worker.companyCustomer.companyName,
      companyEmail: worker.companyCustomer.email,
    });
  } catch (error) {
    console.error("COMPANY_WORKER_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo ingresar como trabajador." },
      { status: 500 }
    );
  }
}
