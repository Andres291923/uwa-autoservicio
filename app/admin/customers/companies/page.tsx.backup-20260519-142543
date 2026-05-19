"use client";

import { useEffect, useState } from "react";

type Company = {
  id: number;
  companyName: string;
  rut: string;
  giro: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  active: boolean;
  orderCount: number;
  totalPurchased: number;
  lastOrder: {
    orderNumber: number;
    total: number;
    status: string;
    scheduledFor: string | null;
    createdAt: string;
  } | null;
};

type BankSettings = {
  businessName: string;
  rut: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  email: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL");
}

export default function AdminCompanyCustomersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bank, setBank] = useState<BankSettings>({
    businessName: "",
    rut: "",
    bank: "",
    accountType: "",
    accountNumber: "",
    email: "",
  });
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");

    const [companiesResponse, bankResponse] = await Promise.all([
      fetch("/api/company-customers", { cache: "no-store" }),
      fetch("/api/company-bank-settings", { cache: "no-store" }),
    ]);

    const companiesData = await companiesResponse.json();
    const bankData = await bankResponse.json();

    if (companiesResponse.ok) setCompanies(Array.isArray(companiesData) ? companiesData : []);
    if (bankResponse.ok) setBank(bankData);
  }

  async function saveBankSettings() {
    const response = await fetch("/api/company-bank-settings", {
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bank),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "No se pudieron guardar datos bancarios.");
      return;
    }

    setBank(data);
    setMessage("Datos bancarios guardados correctamente.");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Clientes
          </p>
          <h1 className="mt-1 text-4xl font-black">Empresas</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Empresas registradas para pedidos programados, transferencia y factura.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/customers"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
          >
            Clientes personales
          </a>
          <a
            href="/pedido-empresas"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
          >
            Ver pedido empresas
          </a>
        </div>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Datos bancarios para transferencia</h2>
        <p className="mt-1 text-sm font-bold text-zinc-500">
          Estos datos aparecerán en la confirmación del pedido empresa.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["businessName", "Razón social"],
            ["rut", "RUT"],
            ["bank", "Banco"],
            ["accountType", "Tipo de cuenta"],
            ["accountNumber", "Número de cuenta"],
            ["email", "Correo comprobante"],
          ].map(([key, label]) => (
            <label key={key}>
              <span className="text-xs font-black uppercase text-zinc-500">
                {label}
              </span>
              <input
                value={(bank as any)[key] || ""}
                onChange={(event) =>
                  setBank((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={saveBankSettings}
          className="mt-5 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white"
        >
          Guardar datos bancarios
        </button>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Empresas registradas</h2>

        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="p-4 font-black">Empresa</th>
                <th className="p-4 font-black">Encargado</th>
                <th className="p-4 font-black">Pedidos</th>
                <th className="p-4 font-black">Total comprado</th>
                <th className="p-4 font-black">Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold text-zinc-500">
                    Aún no hay empresas registradas.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="border-t border-zinc-100">
                    <td className="p-4">
                      <p className="font-black">{company.companyName}</p>
                      <p className="text-xs font-bold text-zinc-500">{company.rut}</p>
                      <p className="text-xs font-bold text-zinc-500">{company.giro}</p>
                      <p className="text-xs font-bold text-zinc-500">{company.address}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-black">{company.contactName}</p>
                      <p className="text-xs font-bold text-zinc-500">{company.email}</p>
                      <p className="text-xs font-bold text-zinc-500">{company.phone}</p>
                    </td>
                    <td className="p-4 text-2xl font-black">{company.orderCount}</td>
                    <td className="p-4 text-lg font-black text-[#10B557]">
                      {formatPrice(company.totalPurchased)}
                    </td>
                    <td className="p-4 font-bold text-zinc-500">
                      {company.lastOrder
                        ? `#${company.lastOrder.orderNumber} · ${formatDate(company.lastOrder.createdAt)}`
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
