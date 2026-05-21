import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCustomerId = Number(searchParams.get("companyCustomerId") || 0);

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
        { status: 400 }
      );
    }

    const invoices = await prisma.companyInvoice.findMany({
      where: { companyCustomerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("GET_COMPANY_INVOICES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar facturas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const companyCustomerId = Number(formData.get("companyCustomerId") || 0);
    const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
    const invoiceDateRaw = String(formData.get("invoiceDate") || "").trim();
    const amount = numberValue(formData.get("amount"));
    const note = String(formData.get("note") || "").trim();
    const file = formData.get("file");

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
        { status: 400 }
      );
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: "Ingresa numero de factura." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes subir un PDF." },
        { status: 400 }
      );
    }

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    const originalName = cleanFileName(file.name || "factura.pdf");
    const storedFileName = String(Date.now()) + "-" + originalName;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "company-invoices"
    );

    await fs.mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.writeFile(path.join(uploadDir, storedFileName), buffer);

    const invoice = await prisma.companyInvoice.create({
      data: {
        companyCustomerId,
        invoiceNumber,
        invoiceDate: invoiceDateRaw ? new Date(invoiceDateRaw + "T12:00:00") : null,
        amount,
        fileUrl: "/uploads/company-invoices/" + storedFileName,
        fileName: file.name || storedFileName,
        note: note || null,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("POST_COMPANY_INVOICE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo subir factura." },
      { status: 500 }
    );
  }
}
