import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workerId = Number(body.workerId || 0);

    if (!workerId) {
      return NextResponse.json({ error: "Trabajador no informado." }, { status: 400 });
    }

    const worker = await prisma.companyWorker.findUnique({
      where: { id: workerId },
      include: { companyCustomer: true },
    });

    if (!worker) {
      return NextResponse.json({ error: "Trabajador no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        walletBalance: worker.walletBalance || 0,
        companyCustomerId: worker.companyCustomerId,
        companyName: worker.companyCustomer.companyName,
      },
      walletBalance: worker.walletBalance || 0,
    });
  } catch (error) {
    console.error("COMPANY_WORKER_BALANCE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar saldo trabajador." },
      { status: 500 }
    );
  }
}
