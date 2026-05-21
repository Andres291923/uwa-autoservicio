import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function normalizeRut(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .replace(/-/g, "");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(body.email);
    const rut = normalizeRut(body.rut);
    const password = cleanText(body.password);

    if (!email) {
      return NextResponse.json({ error: "Ingresa correo del trabajador." }, { status: 400 });
    }

    if (!rut) {
      return NextResponse.json({ error: "Ingresa RUT del trabajador." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "La clave debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    const workers = await prisma.companyWorker.findMany({
      include: { companyCustomer: true },
    });

    const worker = workers.find((item) => {
      return normalizeEmail(item.email) === email && normalizeRut(item.rut) === rut;
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Trabajador no encontrado. Revisa correo y RUT." },
        { status: 404 }
      );
    }

    if (!worker.active) {
      return NextResponse.json({ error: "Este trabajador esta inactivo." }, { status: 403 });
    }

    if (!worker.companyCustomer?.active) {
      return NextResponse.json({ error: "La empresa esta inactiva." }, { status: 403 });
    }

    const updatedWorker = await prisma.companyWorker.update({
      where: { id: worker.id },
      data: { passwordHash: hashPassword(password) },
    });

    return NextResponse.json({
      ok: true,
      worker: {
        id: updatedWorker.id,
        name: updatedWorker.name,
        email: updatedWorker.email,
      },
    });
  } catch (error) {
    console.error("COMPANY_WORKER_CREATE_PASSWORD_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo crear clave del trabajador." },
      { status: 500 }
    );
  }
}
