"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: number;
  name: string;
  unit: string;
  order: number;
  active: boolean;
  categoryId: number;
  subcategoryId: number | null;
  wasteCostPerKg: number;
  categoryName?: string;
};

type Category = {
  id: number;
  name: string;
  items: Item[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function WasteCostsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  const items = useMemo(
    () =>
      categories.flatMap((category) =>
        category.items.map((item) => ({
          ...item,
          categoryName: category.name,
        }))
      ),
    [categories]
  );

  async function load() {
    const response = await fetch("/api/inventory/categories", {
      cache: "no-store",
    });

    const data = await response.json();
    const nextCategories = Array.isArray(data) ? data : [];

    setCategories(nextCategories);

    const nextValues: Record<number, string> = {};

    for (const category of nextCategories) {
      for (const item of category.items || []) {
        nextValues[item.id] = String(item.wasteCostPerKg || 0);
      }
    }

    setValues(nextValues);
  }

  async function save(item: Item) {
    setMessage("");

    const response = await fetch("/api/inventory/items", {
      method: "PUT",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.id,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        name: item.name,
        unit: item.unit,
        order: item.order,
        active: item.active,
        wasteCostPerKg: Number(values[item.id] || 0),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "No se pudo guardar.");
      return;
    }

    setMessage(`Costo actualizado: ${item.name}`);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Inventario
          </p>

          <h1 className="mt-1 text-4xl font-black">Costos para mermas</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Define el valor por kilo para que el equipo calcule pérdidas automáticamente.
          </p>
        </div>

        <a
          href="/mermas"
          className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
        >
          Ir a mermas
        </a>
      </header>

      {message && (
        <p className="mb-5 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="grid gap-3">
          {items.length === 0 ? (
            <p className="rounded-3xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">
              No hay productos de inventario.
            </p>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 rounded-3xl border border-zinc-200 p-4 md:grid-cols-[1fr_220px_140px]"
              >
                <div>
                  <h2 className="text-xl font-black">{item.name}</h2>
                  <p className="text-xs font-bold text-zinc-500">
                    {item.categoryName} · {item.unit || "Sin unidad"}
                  </p>
                </div>

                <label>
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Valor por kilo
                  </span>

                  <input
                    type="number"
                    value={values[item.id] || "0"}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                  />

                  <p className="mt-1 text-xs font-bold text-[#10B557]">
                    {formatPrice(Number(values[item.id] || 0))}/kg
                  </p>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => save(item)}
                    className="w-full rounded-2xl bg-zinc-950 py-3 text-sm font-black text-white"
                  >
                    Guardar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
