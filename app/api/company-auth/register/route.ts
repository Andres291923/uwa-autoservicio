import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail, normalizeRut } from "@/lib/company-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyName = String(body.companyName || "").trim();
    const rut = normalizeRut(body.rut);
    const giro = String(body.giro || "").trim();
    const address = String(body.address || "").trim();
    const contactName = String(body.contactName || "").trim();
    const phone = String(body.phone || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!companyName || !rut || !giro || !address || !contactName || !phone || !email || !password) {
      return NextResponse.json(
        { error: "Completa todos los datos de la empresa." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.create({
      data: {
        companyName,
        rut,
        giro,
        address,
        contactName,
        phone,
        email,
        passwordHash: hashPassword(password),
        active: true,
      },
    });

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
  } catch (error: any) {
    console.error("COMPANY_REGISTER_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una empresa con ese RUT o correo." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo registrar la empresa." },
      { status: 500 }
    );
  }
}
