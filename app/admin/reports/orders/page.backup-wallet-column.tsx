"use client";

import { useEffect, useMemo, useState } from "react";

type OrderDetailModifier = {
  groupName: string;
  optionName: string;
  price: number;
};

type OrderDetailItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  categoryName: string;
  modifiers: OrderDetailModifier[];
};

type OrderReportRow = {
  id: number;
  orderNumber: number;
  createdAt: string;
  customerName: string;
  purchaseAmount: number;
  tipAmount: number;
  totalPaid: number;
  walletAmountUsed: number;
  paymentMethod: string;
  orderSource: string;
  status: string;
  detail: OrderDetailItem[];
};

type ReportSummary = {
  totalOrders: number;
  totalPurchaseAmount: number;
  totalTips: number;
  totalPaid: number;
  totalWalletUsed: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayChileInputDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export default function OrdersReportPage() {
  const today = useMemo(() => todayChileInputDate(), []);

  const [rows, setRows] = useState<OrderReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalOrders: 0,
    totalPurchaseAmount: 0,
    totalTips: 0,
    totalPaid: 0,
    totalWalletUsed: 0,
  });

  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  async function loadReport() {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/reports/orders?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar el reporte.");
        return;
      }

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary || summary);
      setOpenOrderId(null);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Reporte detallado
        </p>

        <h1 className="mt-2 text-4xl font-black">Pedidos</h1>

        <p className="mt-2 text-sm font-bold text-zinc-500">
          Ventas en filas con detalle de comanda por número de pedido.
        </p>
      </div>

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_190px_190px_auto]">
          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Buscar
            </span>

            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="N° de orden o nombre"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Desde
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Hasta
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              suppressHydrationWarning
              onClick={loadReport}
              disabled={loading}
              className="w-full rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white shadow-sm disabled:bg-zinc-300"
            >
              {loading ? "Cargando..." : "Buscar"}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-5">
        <article className="rounded-3xl bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">Pedidos</p>
          <p className="mt-2 text-4xl font-black">{summary.totalOrders}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Valor compras
          </p>
          <p className="mt-2 text-2xl font-black">
            {formatPrice(summary.totalPurchaseAmount)}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">Propinas</p>
          <p className="mt-2 text-2xl font-black">
            {formatPrice(summary.totalTips)}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Total venta
          </p>
          <p className="mt-2 text-2xl font-black text-[#10B557]">
            {formatPrice(summary.totalPaid)}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Billetera
          </p>
          <p className="mt-2 text-2xl font-black">
            {formatPrice(summary.totalWalletUsed)}
          </p>
        </article>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-4 font-black">N° Pedido</th>
                <th className="px-4 py-4 font-black">Fecha y hora</th>
                <th className="px-4 py-4 font-black">Comprador</th>
                <th className="px-4 py-4 font-black">Valor compra</th>
                <th className="px-4 py-4 font-black">Propina</th>
                <th className="px-4 py-4 font-black">Total venta</th>
                <th className="px-4 py-4 font-black">Medio de pago</th>
                <th className="px-4 py-4 font-black">Origen</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-bold text-zinc-500"
                  >
                    No hay pedidos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isOpen = openOrderId === row.id;

                  return (
                    <>
                      <tr key={row.id} className="border-t border-zinc-100">
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenOrderId(isOpen ? null : row.id)
                            }
                            className="font-black text-[#10B557] underline-offset-4 hover:underline"
                          >
                            #{String(row.orderNumber).padStart(3, "0")}
                          </button>
                        </td>

                        <td className="px-4 py-4 font-bold">
                          {formatDateTime(row.createdAt)}
                        </td>

                        <td className="px-4 py-4 font-bold">
                          {row.customerName}
                        </td>

                        <td className="px-4 py-4 font-black">
                          {formatPrice(row.purchaseAmount)}
                        </td>

                        <td className="px-4 py-4 font-bold">
                          {formatPrice(row.tipAmount)}
                        </td>

                        <td className="px-4 py-4 font-black text-[#10B557]">
                          {formatPrice(row.totalPaid)}
                        </td>

                        <td className="px-4 py-4 font-bold">
                          {row.paymentMethod}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black uppercase">
                            {row.orderSource}
                          </span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="border-t border-zinc-100 bg-zinc-50">
                          <td colSpan={8} className="px-4 py-5">
                            <div className="rounded-3xl bg-white p-5 shadow-sm">
                              <div className="mb-4 flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                                    Detalle comanda
                                  </p>

                                  <h3 className="mt-1 text-2xl font-black">
                                    Pedido #
                                    {String(row.orderNumber).padStart(3, "0")}
                                  </h3>
                                </div>

                                <p className="text-xl font-black text-[#10B557]">
                                  {formatPrice(row.totalPaid)}
                                </p>
                              </div>

                              <div className="space-y-3">
                                {row.detail.map((item, index) => (
                                  <article
                                    key={`${row.id}-${index}`}
                                    className="rounded-2xl border border-zinc-200 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <h4 className="text-lg font-black">
                                          {item.quantity}x {item.productName}
                                        </h4>

                                        {item.categoryName && (
                                          <p className="mt-1 text-xs font-black uppercase text-zinc-400">
                                            {item.categoryName}
                                          </p>
                                        )}
                                      </div>

                                      <p className="font-black">
                                        {formatPrice(item.total)}
                                      </p>
                                    </div>

                                    {item.modifiers.length > 0 && (
                                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                                        {item.modifiers.map((modifier, idx) => (
                                          <div
                                            key={`${modifier.optionName}-${idx}`}
                                            className="rounded-xl bg-zinc-50 p-3"
                                          >
                                            <p className="text-xs font-black uppercase text-zinc-400">
                                              {modifier.groupName}
                                            </p>

                                            <p className="font-bold">
                                              {modifier.optionName}
                                              {modifier.price > 0
                                                ? ` + ${formatPrice(
                                                    modifier.price
                                                  )}`
                                                : ""}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
