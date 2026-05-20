"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  subcategoryId: number | null;
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
  subcategories: {
    id: number;
    name: string;
  }[];
  items: InventoryItem[];
};

function todayInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function InventoryEntryPage() {
  const [date, setDate] = useState(todayInput());
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [values, setValues] = useState<Record<number, { quantity: string; comment: string }>>({});
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

      const nextValues: Record<number, { quantity: string; comment: string }> = {};

      for (const category of data.categories || []) {
        for (const item of category.items || []) {
          nextValues[item.id] = {
            quantity: item.entry ? String(item.entry.quantity) : "0",
            comment: item.entry?.comment || "",
          };
        }
      }

      setValues(nextValues);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar inventario.");
    } finally {
      setLoading(false);
    }
  }

  function updateValue(itemId: number, field: "quantity" | "comment", value: string) {
    setValues((current) => ({
      ...current,
      [itemId]: {
        quantity: current[itemId]?.quantity || "0",
        comment: current[itemId]?.comment || "",
        [field]: value,
      },
    }));
  }

  async function saveInventory() {
    try {
      setLoading(true);
      setMessage("");

      const entries = Object.entries(values).map(([itemId, value]) => ({
        itemId: Number(itemId),
        quantity: Number(value.quantity || 0),
        comment: value.comment || "",
      }));

      const response = await fetch("/api/inventory/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          entries,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar inventario.");
        return;
      }

      setMessage("Inventario guardado correctamente.");
      await loadInventory(date);
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory(date);
  }, []);

  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
      <section className="mx-auto max-w-5xl rounded-[2rem] bg-white p-6 shadow-sm">
        <header className="mb-6 relative text-center">
          <a
            href="/admin/inventory"
            className="absolute left-0 top-0 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800 shadow-sm"
          >
            Volver al menú
          </a>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Inventario diario
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Cierre de turno
          </h1>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Ingresa cuanto quedo de cada producto y agrega comentarios si corresponde.
          </p>
        </header>

        <div className="mb-6 grid gap-4">
          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Fecha
            </span>

            <input
              suppressHydrationWarning
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                loadInventory(event.target.value);
              }}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>


        </div>

        {message && (
          <p className="mb-6 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
            {message}
          </p>
        )}

        {categories.length === 0 ? (
          <div className="rounded-3xl bg-zinc-50 p-8 text-center">
            <p className="text-xl font-black">No hay productos creados.</p>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Primero crea categorias y productos desde admin.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <section key={category.id}>
                <h2 className="mb-3 border-b border-zinc-200 pb-2 text-2xl font-black uppercase">
                  {category.name}
                </h2>

                <div className="space-y-4">
                  {category.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-black">{item.name}</h3>

                          <p className="text-xs font-bold text-zinc-500">
                            {item.subcategory?.name || "Sin subcategoria"}
                            {item.unit ? ` Â· ${item.unit}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                        <label>
                          <span className="text-xs font-black uppercase text-zinc-500">
                            Cantidad
                          </span>

                          <input
                            suppressHydrationWarning
                            type="number"
                            step="0.01"
                            value={values[item.id]?.quantity || "0"}
                            onChange={(event) =>
                              updateValue(item.id, "quantity", event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
                          />
                        </label>

                        <label>
                          <span className="text-xs font-black uppercase text-zinc-500">
                            Comentario
                          </span>

                          <input
                            suppressHydrationWarning
                            value={values[item.id]?.comment || ""}
                            onChange={(event) =>
                              updateValue(item.id, "comment", event.target.value)
                            }
                            placeholder="Ej: 320 gramos, tarro mediano, lexan grande"
                            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
