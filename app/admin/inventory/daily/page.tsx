"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  subcategory: {
    id: number;
    name: string;
  } | null;
  entry: {
    quantity: number;
    comment: string;
  } | null;
};

type InventoryCategory = {
  id: number;
  name: string;
  items: InventoryItem[];
};

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export default function DailyInventoryViewPage() {
  const [date, setDate] = useState(todayInput());
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadInventory(selectedDate = date) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/inventory/entries?date=${selectedDate}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar inventario.");
        return;
      }

      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory(date);
  }, []);

  const summary = useMemo(() => {
    let totalItems = 0;
    let withData = 0;
    let withComment = 0;

    for (const category of categories) {
      for (const item of category.items || []) {
        totalItems += 1;

        if (item.entry) {
          const quantity = Number(item.entry.quantity || 0);
          const comment = String(item.entry.comment || "").trim();

          if (quantity > 0 || comment) withData += 1;
          if (comment) withComment += 1;
        }
      }
    }

    return { totalItems, withData, withComment };
  }, [categories]);

  return (
    <main className="min-h-screen bg-zinc-50 p-5 text-zinc-950">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Inventario
            </p>

            <h1 className="mt-1 text-4xl font-black">Inventario diario</h1>

            <p className="mt-1 text-sm font-bold text-zinc-500">
              Revisa lo que el equipo registró al cierre de turno.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/inventario"
              className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
            >
              Registrar inventario
            </a>

            <a
              href="/admin/inventory"
              className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800"
            >
              Volver al menú
            </a>
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label>
              <span className="text-xs font-black uppercase text-zinc-500">
                Fecha
              </span>

              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  loadInventory(event.target.value);
                }}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadInventory(date)}
                className="w-full rounded-2xl bg-[#10B557] px-8 py-3 text-sm font-black text-white"
              >
                {loading ? "Cargando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] bg-[#10B557] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase">Productos</p>
            <p className="mt-2 text-4xl font-black">{summary.totalItems}</p>
            <p className="mt-1 text-sm font-bold">En inventario</p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Registrados
            </p>
            <p className="mt-2 text-4xl font-black">{summary.withData}</p>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Con cantidad o comentario
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Comentarios
            </p>
            <p className="mt-2 text-4xl font-black">{summary.withComment}</p>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Observaciones del equipo
            </p>
          </div>
        </section>

        {message && (
          <p className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
            {message}
          </p>
        )}

        <section className="space-y-6">
          {categories.map((category) => (
            <article key={category.id} className="rounded-[2rem] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-2xl font-black uppercase">{category.name}</h2>

              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="p-4 font-black">Producto</th>
                      <th className="p-4 font-black">Cantidad</th>
                      <th className="p-4 font-black">Comentario</th>
                    </tr>
                  </thead>

                  <tbody>
                    {category.items.map((item) => {
                      const quantity = item.entry?.quantity ?? "";
                      const comment = item.entry?.comment || "";

                      return (
                        <tr key={item.id} className="border-t border-zinc-100">
                          <td className="p-4 font-black">
                            {item.name}
                            <p className="text-xs font-bold text-zinc-500">
                              {item.subcategory?.name || "Sin subcategoría"}
                              {item.unit ? ` · ${item.unit}` : ""}
                            </p>
                          </td>

                          <td className="p-4 font-black">
                            {quantity === "" ? "-" : quantity}
                          </td>

                          <td className="p-4 font-bold text-zinc-600">
                            {comment || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
