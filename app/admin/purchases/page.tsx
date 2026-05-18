"use client";

import { useEffect, useMemo, useState } from "react";

type PurchaseInvoice = {
  id: number;
  issueDate: string;
  supplierRut: string;
  supplierName: string;
  documentType: string;
  folio: string;
  netAmount: number;
  exemptAmount: number;
  ivaAmount: number;
  totalAmount: number;
  category: string;
  note: string;
};

type PurchaseSummary = {
  totalPurchases: number;
  totalDirectInput: number;
  totalPackaging: number;
  totalFixedExpense: number;
  totalService: number;
  totalInvestment: number;
  totalIgnored: number;
  totalUnclassified: number;
  invoiceCount: number;
};

const categories = [
  { value: "unclassified", label: "Sin clasificar" },
  { value: "direct_input", label: "Insumo directo" },
  { value: "packaging", label: "Envases" },
  { value: "fixed_expense", label: "Gasto fijo" },
  { value: "service", label: "Servicio" },
  { value: "investment", label: "Inversión" },
  { value: "ignore", label: "No considerar" },
];

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function firstDayOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("es-CL");
  } catch {
    return value;
  }
}

export default function PurchasesPage() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayInput());
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const operationalCost = useMemo(() => {
    if (!summary) return 0;
    return (
      summary.totalDirectInput +
      summary.totalPackaging +
      summary.totalFixedExpense +
      summary.totalService
    );
  }, [summary]);

  async function loadPurchases() {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams({
        from,
        to,
        category,
        q,
      });

      const response = await fetch(`/api/purchases?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron cargar compras.");
        return;
      }

      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar compras.");
    } finally {
      setLoading(false);
    }
  }

  async function importFile() {
    try {
      if (!file) {
        setMessage("Selecciona un archivo del SII.");
        return;
      }

      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/purchases/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo importar archivo.");
        return;
      }

      setMessage(
        `Importado: ${data.importedRows} filas. Omitidas: ${data.skippedRows}.`
      );
      setFile(null);
      await loadPurchases();
    } catch (error) {
      console.error(error);
      setMessage("Error al importar archivo.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInvoice(
    invoice: PurchaseInvoice,
    changes: Partial<PurchaseInvoice>
  ) {
    try {
      const response = await fetch("/api/purchases", {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: invoice.id,
          category: changes.category ?? invoice.category,
          note: changes.note ?? invoice.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo actualizar compra.");
        return;
      }

      setInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id
            ? {
                ...item,
                ...data,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al actualizar compra.");
    }
  }

  useEffect(() => {
    loadPurchases();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Compras SII
          </p>

          <h1 className="mt-1 text-4xl font-black">Importador de compras</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Importa compras registradas en SII y clasifícalas para cruzarlas con ventas, mermas y costos.
          </p>
        </div>

        <a
          href="/admin/reports"
          className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800 shadow-sm"
        >
          Volver a reportes
        </a>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Importar archivo SII</h2>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Sube el Excel/CSV de compras del SII. El sistema leerá fecha, proveedor, folio y montos.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-5 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
          />

          <button
            type="button"
            onClick={importFile}
            disabled={loading || !file}
            className="mt-4 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {loading ? "Procesando..." : "Importar compras"}
          </button>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Filtros</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <label>
              <span className="text-xs font-black uppercase text-zinc-500">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase text-zinc-500">Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase text-zinc-500">Categoría</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              >
                <option value="all">Todas</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase text-zinc-500">Buscar</span>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Proveedor, RUT o folio"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={loadPurchases}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            Actualizar reporte
          </button>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">Compras</p>
          <p className="mt-2 text-4xl font-black">
            {formatPrice(summary?.totalPurchases || 0)}
          </p>
          <p className="mt-1 text-sm font-bold">Total importado</p>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Insumos directos
          </p>
          <p className="mt-2 text-4xl font-black">
            {formatPrice(summary?.totalDirectInput || 0)}
          </p>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Alimentos / materia prima
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Costo operativo
          </p>
          <p className="mt-2 text-4xl font-black">
            {formatPrice(operationalCost)}
          </p>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Insumos + envases + servicios
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Sin clasificar
          </p>
          <p className="mt-2 text-4xl font-black text-red-600">
            {formatPrice(summary?.totalUnclassified || 0)}
          </p>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Pendiente revisar
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Facturas importadas</h2>

        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="p-3 font-black">Fecha</th>
                <th className="p-3 font-black">Proveedor</th>
                <th className="p-3 font-black">Folio</th>
                <th className="p-3 font-black">Total</th>
                <th className="p-3 font-black">Clasificación</th>
                <th className="p-3 font-black">Nota</th>
              </tr>
            </thead>

            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-bold text-zinc-500">
                    No hay compras para este rango.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-zinc-100">
                    <td className="p-3 font-bold">{formatDate(invoice.issueDate)}</td>

                    <td className="p-3">
                      <p className="font-black">{invoice.supplierName || "Sin proveedor"}</p>
                      <p className="text-xs font-bold text-zinc-500">{invoice.supplierRut}</p>
                    </td>

                    <td className="p-3 font-bold">
                      <p>{invoice.folio || "-"}</p>
                      <p className="text-xs text-zinc-500">{invoice.documentType}</p>
                    </td>

                    <td className="p-3 text-lg font-black text-[#10B557]">
                      {formatPrice(invoice.totalAmount)}
                    </td>

                    <td className="p-3">
                      <select
                        value={invoice.category}
                        onChange={(event) =>
                          updateInvoice(invoice, { category: event.target.value })
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black"
                      >
                        {categories.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <input
                        defaultValue={invoice.note || ""}
                        onBlur={(event) =>
                          updateInvoice(invoice, { note: event.target.value })
                        }
                        placeholder="Comentario"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs font-bold"
                      />
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
