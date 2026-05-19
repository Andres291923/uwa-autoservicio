import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ID = 1;

export async function GET() {
  try {
    const settings = await prisma.companyBankSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {},
      create: {
        id: DEFAULT_ID,
        businessName: "ÜWA SPA",
        rut: "",
        bank: "",
        accountType: "",
        accountNumber: "",
        email: "contacto@uwa.cl",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET_COMPANY_BANK_SETTINGS_ERROR", error);
    return NextResponse.json(
      { error: "No se pudieron cargar datos bancarios." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const settings = await prisma.companyBankSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {
        businessName: String(body.businessName || "").trim(),
        rut: String(body.rut || "").trim(),
        bank: String(body.bank || "").trim(),
        accountType: String(body.accountType || "").trim(),
        accountNumber: String(body.accountNumber || "").trim(),
        email: String(body.email || "").trim(),
      },
      create: {
        id: DEFAULT_ID,
        businessName: String(body.businessName || "").trim(),
        rut: String(body.rut || "").trim(),
        bank: String(body.bank || "").trim(),
        accountType: String(body.accountType || "").trim(),
        accountNumber: String(body.accountNumber || "").trim(),
        email: String(body.email || "").trim(),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("UPDATE_COMPANY_BANK_SETTINGS_ERROR", error);
    return NextResponse.json(
      { error: "No se pudieron guardar datos bancarios." },
      { status: 500 }
    );
  }
}
