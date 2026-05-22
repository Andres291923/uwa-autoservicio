import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function valueFrom(row: any, keys: string[]) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }

  return "";
}

export async function GET() {
  try {
    let rows: any[] = [];

    try {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM CompanyBankSettings ORDER BY id DESC LIMIT 1`
      );
    } catch {
      rows = [];
    }

    const row = rows[0] || null;

    if (!row) {
      return NextResponse.json({
        configured: false,
        bank: null,
      });
    }

    const bank = {
      holderName: valueFrom(row, [
        "holderName",
        "accountHolder",
        "accountHolderName",
        "name",
        "businessName",
      ]),
      rut: valueFrom(row, [
        "rut",
        "holderRut",
        "accountRut",
        "businessRut",
      ]),
      bankName: valueFrom(row, [
        "bankName",
        "bank",
      ]),
      accountType: valueFrom(row, [
        "accountType",
        "type",
      ]),
      accountNumber: valueFrom(row, [
        "accountNumber",
        "number",
      ]),
      email: valueFrom(row, [
        "email",
        "receiptEmail",
        "transferEmail",
        "proofEmail",
        "comprobanteEmail",
      ]),
      notes: valueFrom(row, [
        "notes",
        "description",
        "instructions",
      ]),
    };

    return NextResponse.json({
      configured: true,
      bank,
    });
  } catch (error) {
    console.error("PUBLIC_COMPANY_BANK_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los datos bancarios." },
      { status: 500 }
    );
  }
}
