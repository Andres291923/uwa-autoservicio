import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateWalletBreakdown,
  isCashbackTransaction,
  isExpiredCashback,
} from "@/lib/wallet";

function startOfLocalDate(dateText: string) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfLocalDate(dateText: string) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const from =
      searchParams.get("from") || new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") || from;
    const now = new Date();

    const allCredits = await prisma.walletTransaction.findMany({
      where: {
        type: "credit",
        createdAt: {
          gte: startOfLocalDate(from),
          lte: endOfLocalDate(to),
        },
      },
      include: {
        customer: {
          include: {
            walletTransactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const transactions = allCredits.filter((transaction) =>
      isCashbackTransaction(transaction)
    );

    const totalCashback = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    );

    const expiredCashback = transactions.reduce(
      (sum, transaction) =>
        sum + (isExpiredCashback(transaction, now) ? transaction.amount : 0),
      0
    );

    const customerMap = new Map<
      number,
      {
        customerId: number;
        name: string;
        email: string;
        count: number;
        amount: number;
        expiredAmount: number;
        availableCashback: number;
        walletBalance: number;
      }
    >();

    for (const transaction of transactions) {
      const customerId = transaction.customerId;

      const wallet = calculateWalletBreakdown(
        transaction.customer?.walletTransactions || [],
        now
      );

      const current = customerMap.get(customerId) || {
        customerId,
        name: transaction.customer?.name || "Cliente sin nombre",
        email: transaction.customer?.email || "",
        count: 0,
        amount: 0,
        expiredAmount: 0,
        availableCashback: wallet.cashbackBalance,
        walletBalance: wallet.totalBalance,
      };

      current.count += 1;
      current.amount += transaction.amount;

      if (isExpiredCashback(transaction, now)) {
        current.expiredAmount += transaction.amount;
      }

      customerMap.set(customerId, current);
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    const oneTimeCustomers = customers.filter((customer) => customer.count === 1);
    const repeatedCustomers = customers.filter((customer) => customer.count > 1);

    const repeatedEvents = repeatedCustomers.reduce(
      (sum, customer) => sum + customer.count,
      0
    );

    const repeatedAmount = repeatedCustomers.reduce(
      (sum, customer) => sum + customer.amount,
      0
    );

    const availableCashback = customers.reduce(
      (sum, customer) => sum + customer.availableCashback,
      0
    );

    return NextResponse.json({
      from,
      to,
      totalCashback,
      availableCashback,
      expiredCashback,
      totalEvents: transactions.length,
      uniqueCustomers: customers.length,
      oneTimeCustomers: oneTimeCustomers.length,
      repeatedCustomers: repeatedCustomers.length,
      repeatedEvents,
      repeatedAmount,
      customers,
    });
  } catch (error) {
    console.error("REPORT_CASHBACK_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar reporte de cashback." },
      { status: 500 }
    );
  }
}
