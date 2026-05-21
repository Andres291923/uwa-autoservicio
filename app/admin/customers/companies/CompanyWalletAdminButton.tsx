"use client";

import { useState } from "react";

type Invoice = {
  id: number;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string | null;
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  invoice: Invoice | null;
};

type Props = {
  companyId: number;
  companyName: string;
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
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CL");
}

export default function CompanyWalletAdminButton({
  companyId,
  companyName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Carga manual saldo empresa");
  const [invoiceId, setInvoiceId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setOpen(true);
      setLoading(true);
      setMessage("");

      const [walletResponse, invoicesResponse] = await Promise.all([
        fetch(`/api/company-wallet-transactions?companyCustomerId=${companyId}`, {
          cache: "no-store",
        }),
        fetch(`/api/company-invoices?companyCustomerId=${companyId}`, {
          cache: "no-store",
        }),
      ]);

      const walletData = await walletResponse.json();
      const invoicesData = await invoicesResponse.json();

      if (walletResponse.ok) {
        setWalletBalance(walletData.company?.walletBalance || 0);
        setTransactions(
          Array.isArray(walletData.transactions) ? walletData.transactions : []
        );
      } else {
        setMessage(walletData.error || "No se pudo cargar saldo.");
      }

      if (invoicesResponse.ok) {
        setInvoices(Array.isArray(invoicesData.invoices) ? invoicesData.invoices : []);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar saldo empresa.");
    } finally {
      setLoading(false);
    }
  }

  async function addBalance() {
    try {
      setSaving(true);
      setMessage("");

      const cleanAmount = Number(amount);

      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        setMessage("Ingresa un monto valido.");
        return;
      }

      const response = await fetch("/api/company-wallet-transactions", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyCustomerId: companyId,
          amount: cleanAmount,
          reason,
          invoiceId: invoiceId || null,
          createdBy: "admin",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar saldo.");
        return;
      }

      setAmount("");
      setReason("Carga manual saldo empresa");
      setInvoiceId("");
      setMessage("Saldo cargado correctamente.");

      await load();
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar saldo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={load}
        className="mt-2 rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
      >
        Cargar saldo
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Saldo empresa
                </p>
                <h2 className="mt-2 text-3xl font-black">{companyName}</h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Carga saldo manual y revisa movimientos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            {message && (
              <p className="mb-4 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
                {message}
              </p>
            )}

            <section className="mb-6 rounded-3xl bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase text-emerald-700">
                Saldo disponible empresa
              </p>
              <p className="mt-2 text-4xl font-black text-[#10B557]">
                {formatPrice(walletBalance)}
              </p>
            </section>

            <section className="mb-6 rounded-3xl bg-zinc-50 p-5">
              <h3 className="text-xl font-black">Cargar saldo manual</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Monto
                  </span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Ej: 100000"
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Motivo
                  </span>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Factura asociada
                  </span>
                  <select
                    value={invoiceId}
                    onChange={(event) => setInvoiceId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
                  >
                    <option value="">Sin factura asociada</option>
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        Factura #{invoice.invoiceNumber} - {formatPrice(invoice.amount)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={addBalance}
                disabled={saving}
                className="mt-5 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
              >
                {saving ? "Cargando..." : "Cargar saldo"}
              </button>
            </section>

            <section>
              <h3 className="mb-4 text-xl font-black">Movimientos de saldo</h3>

              {loading ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
                  Cargando movimientos...
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">
                  Esta empresa aun no tiene movimientos de saldo.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-zinc-200">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="p-4 font-black">Fecha</th>
                        <th className="p-4 font-black">Tipo</th>
                        <th className="p-4 font-black">Monto</th>
                        <th className="p-4 font-black">Saldo despues</th>
                        <th className="p-4 font-black">Motivo</th>
                        <th className="p-4 font-black">Factura</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t border-zinc-100">
                          <td className="p-4 font-bold">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="p-4 font-black">
                            {transaction.type === "credit" ? "Abono" : "Descuento"}
                          </td>
                          <td className="p-4 font-black text-[#10B557]">
                            {formatPrice(transaction.amount)}
                          </td>
                          <td className="p-4 font-black">
                            {formatPrice(transaction.balanceAfter)}
                          </td>
                          <td className="p-4 font-bold text-zinc-600">
                            {transaction.reason}
                          </td>
                          <td className="p-4 font-bold">
                            {transaction.invoice ? (
                              <a
                                href={transaction.invoice.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#10B557] underline"
                              >
                                Factura #{transaction.invoice.invoiceNumber}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
