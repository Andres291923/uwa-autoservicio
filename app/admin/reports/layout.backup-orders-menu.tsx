import Link from "next/link";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Reportes
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/reports"
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 shadow-sm"
          >
            Resumen de ventas
          </Link>

          <Link
            href="/admin/reports/orders"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Detalle de pedidos
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
