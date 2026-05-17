"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type LinkedCustomer = {
  id: number;
  name: string;
  email: string;
  walletBalance: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function TotemSessionClient({
  code,
  loginUrl,
}: {
  code: string;
  loginUrl: string;
}) {
  const [customer, setCustomer] = useState<LinkedCustomer | null>(null);
  const [status, setStatus] = useState("waiting");

  async function checkStatus() {
    try {
      const response = await fetch(
        `/api/totem-sessions/status?code=${code}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) return;

      setStatus(data.status || "waiting");

      if (data.linked && data.customer) {
        setCustomer(data.customer);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(checkStatus, 2000);
    return () => window.clearInterval(interval);
  }, []);

  if (customer) {
    return (
      <div className="mt-8 rounded-[2rem] bg-emerald-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
          Cliente conectado
        </p>

        <h2 className="mt-2 text-4xl font-black">
          Hola, {customer.name}
        </h2>

        <p className="mt-2 text-sm font-bold text-zinc-500">
          Saldo disponible
        </p>

        <p className="mt-1 text-5xl font-black text-[#10B557]">
          {formatPrice(customer.walletBalance)}
        </p>

        <a
          href="/totem-session-test"
          className="mt-6 inline-flex rounded-2xl bg-[#10B557] px-6 py-4 text-sm font-black text-white"
        >
          Identificar otro cliente
        </a>
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm font-bold text-zinc-500">
        Escanea el QR, entra con tu cuenta y el tótem te reconocerá.
      </p>

      <div className="mt-8 flex justify-center">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <QRCodeSVG value={loginUrl} size={260} />
        </div>
      </div>

      <p className="mt-5 text-sm font-black text-zinc-500">
        Código: {code}
      </p>

      <p className="mt-2 text-sm font-bold text-zinc-400">
        Estado: {status}
      </p>

      <p className="mx-auto mt-3 max-w-xl break-all rounded-2xl bg-zinc-50 p-3 text-xs font-bold text-zinc-500">
        {loginUrl}
      </p>

      <a
        href="/totem-session-test"
        className="mt-6 inline-flex rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
      >
        Generar nuevo QR
      </a>
    </>
  );
}
