import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ID = 1;

function cleanText(value: unknown) {
  return String(value || "").trim();
}

export async function GET() {
  try {
    const settings = await prisma.companyBankSettings.findUnique({
      where: { id: DEFAULT_ID },
    });

    if (
      !settings ||
      !cleanText(settings.businessName) ||
      !cleanText(settings.rut) ||
      !cleanText(settings.bank) ||
      !cleanText(settings.accountType) ||
      !cleanText(settings.accountNumber) ||
      !cleanText(settings.email)
    ) {
      return NextResponse.json({
        configured: false,
        bank: null,
        settings: null,
      });
    }

    const bank = {
      holderName: cleanText(settings.businessName),
      businessName: cleanText(settings.businessName),
      rut: cleanText(settings.rut),
      bankName: cleanText(settings.bank),
      accountType: cleanText(settings.accountType),
      accountNumber: cleanText(settings.accountNumber),
      email: cleanText(settings.email),
      notes: "",
    };

    const modalSettings = {
      businessName: cleanText(settings.businessName),
      rut: cleanText(settings.rut),
      bank: cleanText(settings.bank),
      accountType: cleanText(settings.accountType),
      accountNumber: cleanText(settings.accountNumber),
      email: cleanText(settings.email),
    };

    return NextResponse.json({
      configured: true,
      bank,
      settings: modalSettings,
    });
  } catch (error) {
    console.error("PUBLIC_COMPANY_BANK_SETTINGS_ERROR", error);

    return NextResponse.json(
      {
        configured: false,
        bank: null,
        settings: null,
        error: "No se pudieron cargar los datos bancarios.",
      },
      { status: 500 }
    );
  }
}
