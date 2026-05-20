"use client";

import { useEffect, useState } from "react";

type ReportPayment = {
  paymentMethod: string;
  label: string;
  orders: number;
  total: number;
};

type ReportCategory = {
  categoryName: string;
  quantity: number;
  orders: number;
  total: number;
};

type ReportProduct = {
  productName: string;
  categoryName: string;
  quantity: number;
  total: number;
};

type ReportModifier = {
  groupName: string;
  optionName: string;
  quantity: number;
  totalExtra: number;
};

type SalesReport = {
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalItems: number;
    averageTicket: number;
  };
  payments: ReportPayment[];
  categories: ReportCategory[];
  products: ReportProduct[];
  modifiers: ReportModifier[];
  bowlDetails: ReportModifier[];
};

type CashbackReport = {
  totalCashback: number;
  totalEvents: number;
  uniqueCustomers: number;
  oneTimeCustomers: number;
  repeatedCustomers: number;
  repeatedEvents: number;
  repeatedAmount: number;
  customers: {
    customerId: number;
    name: string;
    email: string;
    count: number;
    amount: number;
  }[];
};
type WasteReport = {
  totalWasteAmount: number;
  totalWasteGrams: number;
  totalEntries: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function todayDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}
export default function SalesReportsPage() {
  const [from, setFrom] = useState(todayDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [wasteReport, setWasteReport] = useState<WasteReport | null>(null);
  const [cashbackReport, setCashbackReport] = useState<CashbackReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      setMessage("");

      const [response, wasteResponse, cashbackResponse] = await Promise.all([
        fetch(`/api/reports/sales?from=${from}&to=${to}`),
        fetch(`/api/reports/waste?from=${from}&to=${to}`),
        fetch(`/api/reports/cashback?from=${from}&to=${to}`),
      ]);

      const data = await response.json();
      const wasteData = await wasteResponse.json();
      const cashbackData = await cashbackResponse.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar el reporte.");
        setReport(null);
        return;
      }

      setReport(data);
      setWasteReport(wasteResponse.ok ? wasteData : null);
      setCashbackReport(cashbackResponse.ok ? cashbackData : null);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar reporte.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Reportes
          </p>
          <h1 className="mt-1 text-3xl font-black">Reporte de ventas</h1>
          <p className="mt-3 text-sm font-bold text-zinc-500">
            Ventas por fecha, medio de pago, productos, categorías y detalle de modificadores.
          </p>
        </div>

        <a
          href="/admin"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
        >
          Volver al admin
        </a>
      </header>

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
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

          <button
            onClick={loadReport}
            disabled={loading}
            className="mt-6 rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {loading ? "Cargando..." : "Filtrar"}
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
            {message}
          </p>
        )}
      </section>

      {report && (
        <>
          <section className="mb-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-[2rem] bg-[#10B557] p-6 text-white shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase opacity-80">Ventas</p>
              <h2 className="mt-3 text-4xl font-black leading-none">
                {report.summary.totalSales}
              </h2>
              <p className="mt-3 text-sm font-bold">Pedidos confirmados</p>
            </div>

            <div className="rounded-[2rem] bg-[#10B557] p-6 text-white shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase opacity-80">
                Total vendido
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none">
                {formatPrice(report.summary.totalRevenue)}
              </h2>
              <p className="mt-3 text-sm font-bold">Ingresos del período</p>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-zinc-500">
                Productos vendidos
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none">
                {report.summary.totalItems}
              </h2>
              <p className="mt-3 text-sm font-bold text-zinc-500">
                Unidades totales
              </p>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-zinc-500">
                Ticket promedio
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none">
                {formatPrice(report.summary.averageTicket)}
              </h2>
              <p className="mt-3 text-sm font-bold text-zinc-500">
                Promedio por venta
              </p>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-zinc-500">
                Mermas
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none text-red-600">
                {formatPrice(wasteReport?.totalWasteAmount || 0)}
              </h2>

              <p className="mt-3 text-sm font-bold text-zinc-500">
                {report.summary.totalRevenue > 0
                  ? `${formatPercent(
                      ((wasteReport?.totalWasteAmount || 0) /
                        report.summary.totalRevenue) *
                        100
                    )} de las ventas`
                  : "Pérdida del período"}
              </p>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm min-h-[165px] flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-zinc-500">
                Cashback generado
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none text-[#10B557]">
                {formatPrice(cashbackReport?.totalCashback || 0)}
              </h2>

              <p className="mt-3 text-sm font-bold text-zinc-500">
                {cashbackReport
                  ? `${cashbackReport.totalEvents} eventos · ${cashbackReport.uniqueCustomers} clientes`
                  : "Sin cashback"}
              </p>

              {cashbackReport && cashbackReport.totalEvents > 0 && (
                <p className="mt-1 text-xs font-black text-zinc-400">
                  {cashbackReport.oneTimeCustomers} una vez · {cashbackReport.repeatedCustomers} repetidos
                </p>
              )}
            </div>
          </section>

          <section className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Ventas por medio de pago</h2>

              <div className="mt-4 space-y-3">
                {report.payments.length === 0 ? (
                  <p className="text-sm font-bold text-zinc-500">
                    Sin ventas en este período.
                  </p>
                ) : (
                  report.payments.map((payment) => (
                    <div
                      key={payment.paymentMethod}
                      className="rounded-2xl bg-zinc-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-black">{payment.label}</h3>
                          <p className="text-sm font-bold text-zinc-500">
                            {payment.orders} venta{payment.orders !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <p className="text-xl font-black text-[#10B557]">
                          {formatPrice(payment.total)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Ventas por categoría</h2>

              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="p-3 font-black">Categoría</th>
                      <th className="p-3 font-black">Unidades</th>
                      <th className="p-3 font-black">Ventas</th>
                      <th className="p-3 font-black">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.categories.map((category) => (
                      <tr
                        key={category.categoryName}
                        className="border-t border-zinc-200"
                      >
                        <td className="p-3 font-bold">{category.categoryName}</td>
                        <td className="p-3">{category.quantity}</td>
                        <td className="p-3">{category.orders}</td>
                        <td className="p-3 font-black text-[#10B557]">
                          {formatPrice(category.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Qué se vendió</h2>
            <p className="mt-3 text-sm font-bold text-zinc-500">
              Detalle por producto: bowls, bebidas u otros productos activos.
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-3 font-black">Producto</th>
                    <th className="p-3 font-black">Categoría</th>
                    <th className="p-3 font-black">Unidades</th>
                    <th className="p-3 font-black">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {report.products.map((product) => (
                    <tr
                      key={`${product.categoryName}-${product.productName}`}
                      className="border-t border-zinc-200"
                    >
                      <td className="p-3 font-bold">{product.productName}</td>
                      <td className="p-3">{product.categoryName}</td>
                      <td className="p-3">{product.quantity}</td>
                      <td className="p-3 font-black text-[#10B557]">
                        {formatPrice(product.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Detalle de bowls</h2>
            <p className="mt-3 text-sm font-bold text-zinc-500">
              Cuántos bowls llevaron arroz, lechuga, zanahoria, repollo, salsas,
              agregados u otras opciones.
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-3 font-black">Grupo</th>
                    <th className="p-3 font-black">Opción</th>
                    <th className="p-3 font-black">Cantidad</th>
                    <th className="p-3 font-black">Extras $</th>
                  </tr>
                </thead>

                <tbody>
                  {report.bowlDetails.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-5 text-center font-bold text-zinc-500"
                      >
                        No hay detalle de bowls en este período.
                      </td>
                    </tr>
                  ) : (
                    report.bowlDetails.map((modifier) => (
                      <tr
                        key={`${modifier.groupName}-${modifier.optionName}`}
                        className="border-t border-zinc-200"
                      >
                        <td className="p-3 font-bold">{modifier.groupName}</td>
                        <td className="p-3">{modifier.optionName}</td>
                        <td className="p-3 font-black">{modifier.quantity}</td>
                        <td className="p-3 font-black text-[#10B557]">
                          {formatPrice(modifier.totalExtra)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Todos los modificadores</h2>
            <p className="mt-3 text-sm font-bold text-zinc-500">
              Vista completa de opciones seleccionadas en cualquier producto.
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-3 font-black">Grupo</th>
                    <th className="p-3 font-black">Opción</th>
                    <th className="p-3 font-black">Cantidad</th>
                    <th className="p-3 font-black">Extras $</th>
                  </tr>
                </thead>

                <tbody>
                  {report.modifiers.map((modifier) => (
                    <tr
                      key={`${modifier.groupName}-${modifier.optionName}`}
                      className="border-t border-zinc-200"
                    >
                      <td className="p-3 font-bold">{modifier.groupName}</td>
                      <td className="p-3">{modifier.optionName}</td>
                      <td className="p-3 font-black">{modifier.quantity}</td>
                      <td className="p-3 font-black text-[#10B557]">
                        {formatPrice(modifier.totalExtra)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}




