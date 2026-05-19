import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyPassword } from "@/lib/company-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Ingresa correo y clave." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.findUnique({
      where: { email },
    });

    if (!company || !company.active) {
      return NextResponse.json(
        { error: "Empresa no encontrada o inactiva." },
        { status: 404 }
      );
    }

    const valid = verifyPassword(password, company.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Correo o clave incorrectos." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: company.id,
      companyName: company.companyName,
      rut: company.rut,
      giro: company.giro,
      address: company.address,
      contactName: company.contactName,
      phone: company.phone,
      email: company.email,
      active: company.active,
    });
  } catch (error) {
    console.error("COMPANY_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo ingresar." },
      { status: 500 }
    );
  }
}
