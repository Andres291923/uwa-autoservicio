export type WalletTransactionLike = {
  type: string;
  amount: number;
  reason?: string | null;
  source?: string | null;
  expiresAt?: Date | string | null;
};

export function isCashbackTransaction(transaction: WalletTransactionLike) {
  const source = String(transaction.source || "").toLowerCase();
  const reason = String(transaction.reason || "").toLowerCase();

  return source === "cashback" || reason.includes("cashback");
}

export function isExpiredCashback(
  transaction: WalletTransactionLike,
  now = new Date()
) {
  if (!isCashbackTransaction(transaction)) return false;
  if (!transaction.expiresAt) return false;

  const expiresAt = new Date(transaction.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) return false;

  return expiresAt <= now;
}

export function calculateWalletBreakdown(
  transactions: WalletTransactionLike[],
  now = new Date()
) {
  let manualCredits = 0;
  let cashbackCredits = 0;
  let expiredCashback = 0;

  let manualDebits = 0;
  let cashbackDebits = 0;
  let genericDebits = 0;

  for (const transaction of transactions || []) {
    const amount = Math.max(0, Number(transaction.amount || 0));
    const type = String(transaction.type || "").toLowerCase();
    const source = String(transaction.source || "").toLowerCase();

    if (type === "credit") {
      if (isCashbackTransaction(transaction)) {
        if (isExpiredCashback(transaction, now)) {
          expiredCashback += amount;
        } else {
          cashbackCredits += amount;
        }
      } else {
        manualCredits += amount;
      }
    }

    if (type === "debit") {
      if (source === "cashback") cashbackDebits += amount;
      else if (source === "manual") manualDebits += amount;
      else genericDebits += amount;
    }
  }

  let cashbackBalance = Math.max(0, cashbackCredits - cashbackDebits);
  let manualBalance = Math.max(0, manualCredits - manualDebits);

  // Los usos antiguos o genéricos se descuentan primero del cashback y luego de la recarga.
  let remainingGenericDebit = genericDebits;

  const cashbackGenericUsed = Math.min(cashbackBalance, remainingGenericDebit);
  cashbackBalance -= cashbackGenericUsed;
  remainingGenericDebit -= cashbackGenericUsed;

  const manualGenericUsed = Math.min(manualBalance, remainingGenericDebit);
  manualBalance -= manualGenericUsed;

  const totalBalance = Math.max(0, cashbackBalance + manualBalance);

  return {
    totalBalance,
    manualBalance,
    cashbackBalance,
    expiredCashback,
    cashbackCredits,
    manualCredits,
  };
}

export function calculateWalletBalance(transactions: WalletTransactionLike[]) {
  return calculateWalletBreakdown(transactions).totalBalance;
}
