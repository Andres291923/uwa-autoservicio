"use client";

import { useEffect, useState } from "react";

type CompanyOrder = {
  orderNumber: number;
  total: number;
  subtotal: number;
  scheduledFor: string | null;
  company?: {
    name?: string;
    companyName?: string;
    rut?: string;
    giro?: string;
    address?: string;
    contactName?: string;
    phone?: string;
    email?: string;
  } | null;
  items: {
    name: string;
    total: number;
    modifiers: string[];
  }[];
};

const DEFAULT_BANK_INFO = {
  businessName: "ÜWA SPA",
  rut: "",
  bank: "",
  accountType: "",
  accountNumber: "",
  email: "contacto@uwa.cl",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Pedido programado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL");
}

export default function CompanyOrderConfirmationPage() {
  const [order, setOrder] = useState<CompanyOrder | null>(null);
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK_INFO);

  useEffect(() => {
    const saved = localStorage.getItem("uwa_company_last_order");
    if (saved) {
      setOrder(JSON.parse(saved));
    }

    fetch("/api/company-bank-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setBankInfo(data))
      .catch(() => setBankInfo(DEFAULT_BANK_INFO));
  }, []);

  if (!order) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
        <section className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black">No encontramos el pedido</h1>
          <a href="/pedido-empresas" className="mt-6 inline-block rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white">
            Volver a pedido empresas
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Pedido empresa recibido
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Pedido #{order.orderNumber}
        </h1>

        <p className="mt-2 text-sm font-bold text-zinc-500">
          Tu pedido fue enviado a cocina como pedido empresa. Para confirmar, realiza la transferencia.
        </p>

        <div className="mt-6 rounded-[2rem] bg-emerald-50 p-6">
          <h2 className="text-2xl font-black text-[#10B557]">
            Datos para transferencia
          </h2>

          <div className="mt-4 grid gap-3 text-sm font-bold md:grid-cols-2">
            <p><strong>Razón social:</strong> {bankInfo.businessName}</p>
            <p><strong>RUT:</strong> {bankInfo.rut}</p>
            <p><strong>Banco:</strong> {bankInfo.bank}</p>
            <p><strong>Tipo cuenta:</strong> {bankInfo.accountType}</p>
            <p><strong>N° cuenta:</strong> {bankInfo.accountNumber}</p>
            <p><strong>Correo:</strong> {bankInfo.email}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] bg-zinc-50 p-6">
          <h2 className="text-2xl font-black">Resumen del pedido</h2>

          <div className="mt-4 grid gap-3 text-sm font-bold md:grid-cols-2">
            <p><strong>Empresa:</strong> {order.company?.companyName || order.company?.name || "-"}</p>
            <p><strong>RUT:</strong> {order.company?.rut || "-"}</p>
            <p><strong>Contacto:</strong> {order.company?.contactName || "-"}</p>
            <p><strong>Correo:</strong> {order.company?.email || "-"}</p>
            <p><strong>Programado:</strong> {formatDate(order.scheduledFor)}</p>
          </div>

          <div className="mt-5 space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="rounded-2xl bg-white p-4">
                <div className="flex justify-between gap-4">
                  <p className="font-black">{item.name}</p>
                  <p className="font-black text-[#10B557]">{formatPrice(item.total)}</p>
                </div>

                {item.modifiers.length > 0 && (
                  <p className="mt-1 text-xs font-bold text-zinc-500">
                    {item.modifiers.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-5">
            <p className="text-xl font-black">Total a transferir</p>
            <p className="text-4xl font-black text-[#10B557]">
              {formatPrice(order.total)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/pedido-empresas" className="rounded-2xl border border-zinc-300 bg-white px-6 py-3 text-sm font-black">
            Volver
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white"
          >
            Imprimir resumen
          </button>
        </div>
      </section>
    </main>
  );
}

