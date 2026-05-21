"use client";

import { useEffect, useState } from "react";

type WorkerTotemSession = {
  accountType: "company_worker_totem";
  workerId: number;
  companyCustomerId: number;
  workerName: string;
  workerEmail: string | null;
  workerRut: string | null;
  walletBalance: number;
  companyName: string;
  companyEmail: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function TotemCompanyWorkerSessionBadge() {
  const [session, setSession] = useState<WorkerTotemSession | null>(null);

  useEffect(() => {
    function loadSession() {
      const saved = window.localStorage.getItem("totem_company_worker_session");

      if (!saved) {
        setSession(null);
        return;
      }

      try {
        setSession(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("totem_company_worker_session");
        setSession(null);
      }
    }

    function handleLogin(event: Event) {
      const customEvent = event as CustomEvent<WorkerTotemSession>;
      setSession(customEvent.detail);
    }

    function handleLogout() {
      setSession(null);
    }

    function handleUpdate(event: Event) {
      const customEvent = event as CustomEvent<WorkerTotemSession>;
      setSession(customEvent.detail);
    }

    loadSession();

    window.addEventListener("totem-company-worker-login", handleLogin);
    window.addEventListener("totem-company-worker-logout", handleLogout);
    window.addEventListener("totem-company-worker-update", handleUpdate);

    return () => {
      window.removeEventListener("totem-company-worker-login", handleLogin);
      window.removeEventListener("totem-company-worker-logout", handleLogout);
      window.removeEventListener("totem-company-worker-update", handleUpdate);
    };
  }, []);

  function logout() {
    window.localStorage.removeItem("totem_company_worker_session");
    setSession(null);
    window.dispatchEvent(new CustomEvent("totem-company-worker-logout"));
  }

  if (!session) return null;

  return (
    <div className="fixed right-4 top-4 z-[999998] max-w-[420px] rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#10B557]">
            Saldo empresa
          </p>

          <p className="truncate text-sm font-black text-zinc-950">
            {session.workerName}
          </p>

          <p className="truncate text-xs font-bold text-zinc-500">
            {session.companyName}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[9px] font-black uppercase text-emerald-700">
            Disponible
          </p>
          <p className="text-xl font-black text-[#10B557]">
            {formatPrice(session.walletBalance)}
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-black"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
