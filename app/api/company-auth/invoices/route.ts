import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyCustomerId = Number(body.companyCustomerId || 0);

    if (!companyCustomerId) {
      return NextResponse.json(
        { error: "Empresa no informada." },
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

    const invoices = await prisma.companyInvoice.findMany({
      where: { companyCustomerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("COMPANY_AUTH_INVOICES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar facturas." },
      { status: 500 }
    );
  }
}
