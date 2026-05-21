"use client";

import { useEffect, useState } from "react";

type Props = {
  companyId: number;
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

export default function CompanyBalanceAmount({
  companyId,
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

        const response = await fetch("/api/company-auth/balance", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyCustomerId: companyId,
          }),
        });

        const data = await response.json();

        if (!active) return;

        if (response.ok) {
          setBalance(Number(data.walletBalance || 0));
        }
      } catch (error) {
        console.error("No se pudo cargar saldo empresa", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (companyId) {
      loadBalance();
    }

    return () => {
      active = false;
    };
  }, [companyId]);


  useEffect(() => {
    function handleCompanyBalanceUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        companyId: number;
        walletBalance: number;
      }>;

      if (Number(customEvent.detail?.companyId) === Number(companyId)) {
        setBalance(Number(customEvent.detail?.walletBalance || 0));
      }
    }

    window.addEventListener(
      "company-balance-updated",
      handleCompanyBalanceUpdated
    );

    return () => {
      window.removeEventListener(
        "company-balance-updated",
        handleCompanyBalanceUpdated
      );
    };
  }, [companyId]);

  return (
    <span className={className}>
      {loading && balance === 0 ? "Cargando..." : formatPrice(balance)}
    </span>
  );
}
