"use client";

import { useEffect, useState } from "react";

type Props = {
  workerId: number;
  initialBalance?: number;
  className?: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function WorkerBalanceAmount({
  workerId,
  initialBalance = 0,
  className = "",
}: Props) {
  const [balance, setBalance] = useState(Number(initialBalance || 0));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      try {
        setLoading(true);

        const response = await fetch("/api/company-worker-auth/balance", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workerId,
          }),
        });

        const data = await response.json();

        if (!active) return;

        if (response.ok) {
          setBalance(Number(data.walletBalance || 0));
        }
      } catch (error) {
        console.error("No se pudo cargar saldo trabajador", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (workerId) {
      loadBalance();
    }

    return () => {
      active = false;
    };
  }, [workerId]);

  return (
    <span className={className}>
      {loading && balance === 0 ? "Cargando..." : formatPrice(balance)}
    </span>
  );
}
