"use client";

import { useState } from "react";

type Invoice = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  amount: number;
  fileUrl: string;
  fileName: string | null;
  note: string | null;
  createdAt: string;
};

type Props = {
  companyId: number;
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
  return date.toLocaleDateString("es-CL");
}

export default function CompanyInvoicesPublicButton({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState("");

  async function loadInvoices() {
    try {
      setOpen(true);
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/company-auth/invoices", {
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

      if (!response.ok) {
        setInvoices([]);
        setMessage(data.error || "No se pudieron cargar facturas.");
        return;
      }

      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (error) {
      console.error(error);
      setInvoices([]);
      setMessage("Error al cargar facturas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        suppressHydrationWarning
        onClick={loadInvoices}
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black"
      >
        Facturas
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Facturas empresa
                </p>
                <h2 className="mt-2 text-3xl font-black">Mis facturas</h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Aqui puedes revisar las facturas asociadas a tus recargas o compras.
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

            {loading ? (
              <div className="rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
                Cargando facturas...
              </div>
            ) : message ? (
              <div className="rounded-3xl bg-red-50 p-6 text-center font-black text-red-600">
                {message}
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-3xl bg-zinc-50 p-8 text-center">
                <p className="text-xl font-black">Aun no tienes facturas.</p>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Cuando UWA suba tus facturas apareceran aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="rounded-3xl border border-zinc-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Factura
                        </p>
                        <h3 className="mt-1 text-2xl font-black">
                          #{invoice.invoiceNumber}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          Fecha: {formatDate(invoice.invoiceDate)}
                        </p>
                        {invoice.note && (
                          <p className="mt-2 text-sm font-bold text-zinc-600">
                            {invoice.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-[#10B557]">
                          {formatPrice(invoice.amount)}
                        </p>

                        <a
                          href={invoice.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-black text-white"
                        >
                          Ver PDF
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
