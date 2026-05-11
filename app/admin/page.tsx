"use client";

import { useEffect, useState } from "react";

type SalesSummary = {
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averageTicket: number;
};

type PaymentSummary = {
  paymentMethod: string;
  label: string;
  orders: number;
  total: number;
};

type CategorySummary = {
  categoryName: string;
  quantity: number;
  orders: number;
  total: number;
};

type SalesReport = {
  summary: SalesSummary;
  payments: PaymentSummary[];
  categories: CategorySummary[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayDateInput() {
  return dateInputValue(new Date());
}

const emptySummary: SalesSummary = {
  totalSales: 0,
  totalRevenue: 0,
  totalItems: 0,
  averageTicket: 0,
};

export default function AdminDashboardPage() {
  const [todayReport, setTodayReport] = useState<SalesReport | null>(null);
  const [monthReport, setMonthReport] = useState<SalesReport | null>(null);
  const [rangeReport, setRangeReport] = useState<SalesReport | null>(null);

  const [from, setFrom] = useState(firstDayOfCurrentMonth());
  const [to, setTo] = useState(todayDateInput());

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchSalesReport(fromDate: string, toDate: string) {
    const response = await fetch(`/api/reports/sales?from=${fromDate}&to=${toDate}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo cargar el reporte.");
    }

    return data as SalesReport;
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage("");

      const today = todayDateInput();
      const monthStart = firstDayOfCurrentMonth();

      const [todayData, monthData, rangeData] = await Promise.all([
        fetchSalesReport(today, today),
        fetchSalesReport(monthStart, today),
        fetchSalesReport(from, to),
      ]);

      setTodayReport(todayData);
      setMonthReport(monthData);
      setRangeReport(rangeData);
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar el dashboard de ventas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRangeOnly() {
    try {
      setLoading(true);
      setMessage("");

      const rangeData = await fetchSalesReport(from, to);
      setRangeReport(rangeData);
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar el rango seleccionado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const todaySummary = todayReport?.summary || emptySummary;
  const monthSummary = monthReport?.summary || emptySummary;
  const rangeSummary = rangeReport?.summary || emptySummary;

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Panel admin
          </p>

          <h1 className="mt-1 text-4xl font-black">Dashboard</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Resumen rápido de ventas del día, ventas del mes y ventas por rango.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/products"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Productos
          </a>

          <a
            href="/admin/reports"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Reportes
          </a>

          <a
            href="/totem"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Ver tótem
          </a>

          <a
            href="/pedido"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Ver pedido online
          </a>

          <a
            href="/cocina"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Ver cocina
          </a>
        </div>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
          {message}
        </p>
      )}

      <section className="mb-6 grid gap-4 xl:grid-cols-4">
        <div className="rounded-3xl bg-[#10B557] p-6 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">
            Ventas hoy
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {formatPrice(todaySummary.totalRevenue)}
          </h2>

          <p className="mt-2 text-sm font-bold">
            {todaySummary.totalSales} pedidos · {todaySummary.totalItems} productos
          </p>
        </div>

        <div className="rounded-3xl bg-[#10B557] p-6 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">
            Ventas mes
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {formatPrice(monthSummary.totalRevenue)}
          </h2>

          <p className="mt-2 text-sm font-bold">
            {monthSummary.totalSales} pedidos · ticket {formatPrice(monthSummary.averageTicket)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Pedidos hoy
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {todaySummary.totalSales}
          </h2>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Ticket promedio {formatPrice(todaySummary.averageTicket)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Productos mes
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {monthSummary.totalItems}
          </h2>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Unidades vendidas en el mes
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Filtro por rango</h2>
            <p className="text-sm font-bold text-zinc-500">
              Selecciona fechas para revisar ventas específicas.
            </p>
          </div>

          <button
            onClick={loadRangeOnly}
            disabled={loading}
            className="rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {loading ? "Cargando..." : "Filtrar rango"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Desde
            </span>

            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Hasta
            </span>

            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase text-zinc-500">
              Total rango
            </p>
            <p className="mt-2 text-3xl font-black text-[#10B557]">
              {formatPrice(rangeSummary.totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase text-zinc-500">
              Pedidos
            </p>
            <p className="mt-2 text-3xl font-black">
              {rangeSummary.totalSales}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase text-zinc-500">
              Productos
            </p>
            <p className="mt-2 text-3xl font-black">
              {rangeSummary.totalItems}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase text-zinc-500">
              Ticket promedio
            </p>
            <p className="mt-2 text-3xl font-black">
              {formatPrice(rangeSummary.averageTicket)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Medios de pago del rango</h2>

          <div className="mt-4 space-y-3">
            {(rangeReport?.payments || []).length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-bold text-zinc-500">
                No hay ventas en el rango seleccionado.
              </p>
            ) : (
              rangeReport?.payments.map((payment) => (
                <div
                  key={payment.paymentMethod}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <p className="font-black">{payment.label}</p>
                    <p className="text-sm font-bold text-zinc-500">
                      {payment.orders} pedidos
                    </p>
                  </div>

                  <p className="text-xl font-black text-[#10B557]">
                    {formatPrice(payment.total)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Categorías del rango</h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="p-3 font-black">Categoría</th>
                  <th className="p-3 font-black">Unidades</th>
                  <th className="p-3 font-black">Total</th>
                </tr>
              </thead>

              <tbody>
                {(rangeReport?.categories || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-5 text-center font-bold text-zinc-500"
                    >
                      No hay ventas en el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  rangeReport?.categories.map((category) => (
                    <tr
                      key={category.categoryName}
                      className="border-t border-zinc-200"
                    >
                      <td className="p-3 font-bold">{category.categoryName}</td>
                      <td className="p-3">{category.quantity}</td>
                      <td className="p-3 font-black text-[#10B557]">
                        {formatPrice(category.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
