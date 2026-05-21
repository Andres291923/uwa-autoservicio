import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function moneyNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
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

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
      select: {
        id: true,
        companyName: true,
        email: true,
        walletBalance: true,
        workers: {
          orderBy: { createdAt: "desc" },
          include: {
            walletTransactions: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
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
      workers: company.workers,
    });
  } catch (error) {
    console.error("GET_COMPANY_WORKERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar trabajadores." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const action = cleanText(body.action);
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

    if (action === "create_worker") {
      const name = cleanText(body.name);
      const email = cleanText(body.email);
      const rut = cleanText(body.rut);
      const phone = cleanText(body.phone);

      if (!name) {
        return NextResponse.json(
          { error: "Ingresa nombre del trabajador." },
          { status: 400 }
        );
      }

      if (email || rut) {
        const existing = await prisma.companyWorker.findFirst({
          where: {
            companyCustomerId,
            OR: [
              ...(email ? [{ email }] : []),
              ...(rut ? [{ rut }] : []),
            ],
          },
        });

        if (existing) {
          return NextResponse.json(
            { error: "Ya existe un trabajador con ese correo o RUT." },
            { status: 400 }
          );
        }
      }

      const worker = await prisma.companyWorker.create({
        data: {
          companyCustomerId,
          name,
          email: email || null,
          rut: rut || null,
          phone: phone || null,
        },
      });

      return NextResponse.json({ worker });
    }

    if (action === "assign_balance") {
      const workerId = Number(body.workerId || 0);
      const amount = moneyNumber(body.amount);
      const reason = cleanText(body.reason) || "Asignacion de saldo a trabajador";

      if (!workerId) {
        return NextResponse.json(
          { error: "Trabajador no informado." },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { error: "El monto debe ser mayor a cero." },
          { status: 400 }
        );
      }

      const worker = await prisma.companyWorker.findFirst({
        where: {
          id: workerId,
          companyCustomerId,
        },
      });

      if (!worker) {
        return NextResponse.json(
          { error: "Trabajador no encontrado." },
          { status: 404 }
        );
      }

      if (!worker.active) {
        return NextResponse.json(
          { error: "El trabajador esta inactivo." },
          { status: 400 }
        );
      }

      if ((company.walletBalance || 0) < amount) {
        return NextResponse.json(
          { error: "Saldo empresa insuficiente." },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedCompany = await tx.companyCustomer.update({
          where: { id: companyCustomerId },
          data: {
            walletBalance: {
              decrement: amount,
            },
          },
        });

        const updatedWorker = await tx.companyWorker.update({
          where: { id: workerId },
          data: {
            walletBalance: {
              increment: amount,
            },
          },
        });

        const companyTransaction = await tx.companyWalletTransaction.create({
          data: {
            companyCustomerId,
            invoiceId: null,
            type: "debit",
            amount,
            balanceAfter: updatedCompany.walletBalance,
            reason: `Asignacion a trabajador: ${updatedWorker.name}`,
            source: "worker_assignment",
            createdBy: "company",
          },
        });

        const workerTransaction = await tx.companyWorkerWalletTransaction.create({
          data: {
            companyWorkerId: workerId,
            companyCustomerId,
            type: "credit",
            amount,
            workerBalanceAfter: updatedWorker.walletBalance,
            companyBalanceAfter: updatedCompany.walletBalance,
            reason,
            source: "company_assignment",
          },
        });

        return {
          company: updatedCompany,
          worker: updatedWorker,
          companyTransaction,
          workerTransaction,
        };
      });

      return NextResponse.json(result);
    }

    if (action === "toggle_worker") {
      const workerId = Number(body.workerId || 0);
      const active = Boolean(body.active);

      if (!workerId) {
        return NextResponse.json(
          { error: "Trabajador no informado." },
          { status: 400 }
        );
      }

      const worker = await prisma.companyWorker.findFirst({
        where: {
          id: workerId,
          companyCustomerId,
        },
      });

      if (!worker) {
        return NextResponse.json(
          { error: "Trabajador no encontrado." },
          { status: 404 }
        );
      }

      const updatedWorker = await prisma.companyWorker.update({
        where: { id: workerId },
        data: { active },
      });

      return NextResponse.json({ worker: updatedWorker });
    }

    return NextResponse.json(
      { error: "Accion no valida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST_COMPANY_WORKERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo procesar trabajadores empresa." },
      { status: 500 }
    );
  }
}
