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
      select: {
        id: true,
        companyName: true,
        email: true,
        walletBalance: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      company,
      walletBalance: company.walletBalance || 0,
    });
  } catch (error) {
    console.error("COMPANY_AUTH_BALANCE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar saldo empresa." },
      { status: 500 }
    );
  }
}
