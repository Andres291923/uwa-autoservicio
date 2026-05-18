import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateWalletBreakdown,
  isCashbackTransaction,
  isExpiredCashback,
} from "@/lib/wallet";

function formatDateOnly(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getCashbackExpirationBatches(transactions: any[], now = new Date()) {
  const credits = transactions
    .filter((transaction) => {
      return (
        transaction.type === "credit" &&
        isCashbackTransaction(transaction) &&
        !isExpiredCashback(transaction, now)
      );
    })
    .map((transaction) => ({
      amount: Math.max(0, Number(transaction.amount || 0)),
      expiresAt: formatDateOnly(transaction.expiresAt || null),
      sortDate: transaction.expiresAt
        ? new Date(transaction.expiresAt).getTime()
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.sortDate - b.sortDate);

  let debitToDiscount = transactions
    .filter((transaction) => {
      const source = String(transaction.source || "").toLowerCase();
      return (
        transaction.type === "debit" &&
        source !== "manual"
      );
    })
    .reduce((sum, transaction) => sum + Math.max(0, Number(transaction.amount || 0)), 0);

  for (const credit of credits) {
    if (debitToDiscount <= 0) break;

    const used = Math.min(credit.amount, debitToDiscount);
    credit.amount -= used;
    debitToDiscount -= used;
  }

  const grouped = new Map<string, { amount: number; expiresAt: string | null }>();

  for (const credit of credits) {
    if (credit.amount <= 0) continue;

    const key = credit.expiresAt || "no-expiration";
    const current = grouped.get(key) || {
      amount: 0,
      expiresAt: credit.expiresAt,
    };

    current.amount += credit.amount;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).filter((item) => item.amount > 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const customerId = Number(searchParams.get("customerId") || 0);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();

    if (!customerId && !email) {
      return NextResponse.json({ error: "Falta cliente." }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: customerId ? { id: customerId } : { email },
      include: {
        walletTransactions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 }
      );
    }

    const now = new Date();
    const breakdown = calculateWalletBreakdown(customer.walletTransactions, now);
    const cashbackExpirations = getCashbackExpirationBatches(
      customer.walletTransactions,
      now
    );

    const nextExpiringCashback = cashbackExpirations[0] || null;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
      totalBalance: breakdown.totalBalance,
      manualBalance: breakdown.manualBalance,
      cashbackBalance: breakdown.cashbackBalance,
      expiredCashback: breakdown.expiredCashback,
      cashbackCredits: breakdown.cashbackCredits,
      manualCredits: breakdown.manualCredits,
      nextCashbackExpiration: nextExpiringCashback?.expiresAt || null,
      nextCashbackAmount: nextExpiringCashback?.amount || 0,
      cashbackExpirations,
    });
  } catch (error) {
    console.error("CUSTOMER_WALLET_SUMMARY_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo cargar resumen de billetera." },
      { status: 500 }
    );
  }
}
