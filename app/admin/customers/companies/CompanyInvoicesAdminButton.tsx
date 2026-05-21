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
  return date.toLocaleDateString("es-CL");
}

export default function CompanyInvoicesAdminButton({
  companyId,
  companyName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function loadInvoices() {
    try {
      setOpen(true);
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/company-invoices?companyCustomerId=${companyId}`,
        { cache: "no-store" }
      );

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

  async function uploadInvoice() {
    try {
      setSaving(true);
      setMessage("");

      if (!invoiceNumber.trim()) {
        setMessage("Ingresa numero de factura.");
        return;
      }

      if (!file) {
        setMessage("Selecciona PDF de factura.");
        return;
      }

      const formData = new FormData();
      formData.append("companyCustomerId", String(companyId));
      formData.append("invoiceNumber", invoiceNumber.trim());
      formData.append("invoiceDate", invoiceDate);
      formData.append("amount", amount || "0");
      formData.append("note", note.trim());
      formData.append("file", file);

      const response = await fetch("/api/company-invoices", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo subir factura.");
        return;
      }

      setInvoiceNumber("");
      setInvoiceDate("");
      setAmount("");
      setNote("");
      setFile(null);
      setMessage("Factura cargada correctamente.");

      await loadInvoices();
    } catch (error) {
      console.error(error);
      setMessage("Error al subir factura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={loadInvoices}
        className="mt-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
      >
        Facturas
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Facturas empresa
                </p>
                <h2 className="mt-2 text-3xl font-black">{companyName}</h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Sube y revisa facturas asociadas a esta empresa.
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

            <section className="mb-6 rounded-3xl bg-zinc-50 p-5">
              <h3 className="text-xl font-black">Subir factura</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Numero factura
                  </span>
                  <input
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    placeholder="Ej: 12345"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Fecha factura
                  </span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Monto
                  </span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    placeholder="Ej: 100000"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Nota
                  </span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    placeholder="Ej: Recarga saldo empresa"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    PDF factura
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={uploadInvoice}
                disabled={saving}
                className="mt-5 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
              >
                {saving ? "Subiendo..." : "Subir factura"}
              </button>
            </section>

            <section>
              <h3 className="mb-4 text-xl font-black">Facturas cargadas</h3>

              {loading ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
                  Cargando facturas...
                </div>
              ) : invoices.length === 0 ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">
                  Esta empresa aun no tiene facturas cargadas.
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
                          <h4 className="mt-1 text-2xl font-black">
                            #{invoice.invoiceNumber}
                          </h4>
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
            </section>
          </div>
        </div>
      )}
    </>
  );
}
