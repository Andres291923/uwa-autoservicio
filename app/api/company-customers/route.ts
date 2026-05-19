import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.companyCustomer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentMethod: true,
            scheduledFor: true,
            createdAt: true,
          },
        },
      },
    });

    const data = companies.map((company) => ({
      id: company.id,
      companyName: company.companyName,
      rut: company.rut,
      giro: company.giro,
      address: company.address,
      contactName: company.contactName,
      phone: company.phone,
      email: company.email,
      active: company.active,
      createdAt: company.createdAt,
      orderCount: company.orders.length,
      totalPurchased: company.orders.reduce((sum, order) => sum + order.total, 0),
      lastOrder: company.orders[0] || null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET_COMPANY_CUSTOMERS_ERROR", error);
    return NextResponse.json(
      { error: "No se pudieron cargar empresas." },
      { status: 500 }
    );
  }
}
