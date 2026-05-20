"use client";

import { useEffect, useMemo, useState } from "react";

type WasteItem = {
  id: number;
  name: string;
  unit: string;
  wasteCostPerKg: number;
  categoryId: number;
  subcategory?: {
    id: number;
    name: string;
  } | null;
};

type WasteCategory = {
  id: number;
  name: string;
  items: WasteItem[];
};

type WasteEntry = {
  id: number;
  entryDate: string;
  productName: string;
  quantityGrams: number;
  amount: number;
  comment: string;
  source: string;
  item?: WasteItem | null;
};

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function WastePage() {
  const [date, setDate] = useState(todayInput());
  const [categories, setCategories] = useState<WasteCategory[]>([]);
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [itemId, setItemId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantityGrams, setQuantityGrams] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("ingredient");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const items = useMemo(
    () => categories.flatMap((category) => category.items || []),
    [categories]
  );

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(itemId)) || null,
    [items, itemId]
  );

  const autoAmount = useMemo(() => {
    const grams = Number(quantityGrams || 0);
    if (!selectedItem || grams <= 0 || selectedItem.wasteCostPerKg <= 0) return 0;
    return Math.round((grams / 1000) * selectedItem.wasteCostPerKg);
  }, [selectedItem, quantityGrams]);

  const finalAmount = Number(manualAmount || 0) > 0 ? Number(manualAmount || 0) : autoAmount;

  const totalDay = entries.reduce((sum, entry) => sum + entry.amount, 0);

  async function loadWaste(selectedDate = date) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/inventory/waste?date=${selectedDate}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar mermas.");
        return;
      }

      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar mermas.");
    } finally {
      setLoading(false);
    }
  }

  async function saveWaste() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/inventory/waste", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          itemId: itemId ? Number(itemId) : null,
          productName,
          quantityGrams: Number(quantityGrams || 0),
          amount: Number(manualAmount || 0),
          comment,
          source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar merma.");
        return;
      }

      setItemId("");
      setProductName("");
      setQuantityGrams("");
      setManualAmount("");
      setComment("");
      setSource("ingredient");
      setMessage("Merma guardada correctamente.");
      await loadWaste(date);
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar merma.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteWaste(id: number) {
    const ok = window.confirm("Eliminar esta merma?");
    if (!ok) return;

    await fetch(`/api/inventory/waste?id=${id}`, {
      method: "DELETE",
    });

    await loadWaste(date);
  }

  useEffect(() => {
    loadWaste(date);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-4 text-zinc-950">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Control operacional
          </p>

          <h1 className="mt-2 text-4xl font-black">Registro diario de mermas</h1>

          <p className="mt-2 text-sm font-bold text-zinc-500">
            Calcula y registra pérdidas por ingredientes, pedidos perdidos o errores operacionales.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">Nueva merma</h2>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">Fecha</span>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  loadWaste(event.target.value);
                }}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Tipo</span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              >
                <option value="ingredient">Ingrediente</option>
                <option value="lost_order">Pedido perdido</option>
                <option value="production">Producción</option>
                <option value="other">Otro</option>
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Producto inventario</span>
              <select
                value={itemId}
                onChange={(event) => {
                  setItemId(event.target.value);
                  setProductName("");
                }}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              >
                <option value="">Seleccionar producto</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.wasteCostPerKg > 0 ? `(${formatPrice(item.wasteCostPerKg)}/kg)` : ""}
                  </option>
                ))}
              </select>
            </label>

            {!itemId && (
              <label className="mt-4 block">
                <span className="text-xs font-black uppercase text-zinc-500">Nombre manual</span>
                <input
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  placeholder="Ej: 4 bowls perdidos PedidosYa"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                />
              </label>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Cantidad en gramos</span>
              <input
                type="number"
                value={quantityGrams}
                onChange={(event) => setQuantityGrams(event.target.value)}
                placeholder="Ej: 300"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Valor manual opcional</span>
              <input
                type="number"
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                placeholder="Ej: 20000 para pedido perdido"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
              />
            </label>

            <div className="mt-5 rounded-3xl bg-emerald-50 p-5 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Valor merma
              </p>

              <p className="mt-2 text-5xl font-black text-[#10B557]">
                {formatPrice(finalAmount)}
              </p>

              {selectedItem && (
                <p className="mt-2 text-xs font-bold text-zinc-500">
                  Base: {formatPrice(selectedItem.wasteCostPerKg)}/kg
                </p>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Comentario</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Ej: PedidosYa sin repartidor, producto vencido, exceso de cocción..."
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
              />
            </label>

            {message && (
              <p className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={saveWaste}
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white disabled:bg-zinc-300"
            >
              Guardar merma
            </button>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Resumen del día
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  {formatPrice(totalDay)}
                </h2>
              </div>

              <div className="rounded-2xl bg-zinc-100 px-5 py-4 text-center">
                <p className="text-xs font-black uppercase text-zinc-500">Registros</p>
                <p className="text-2xl font-black">{entries.length}</p>
              </div>
            </div>

            {entries.length === 0 ? (
              <p className="rounded-3xl bg-zinc-50 p-8 text-center text-sm font-bold text-zinc-500">
                Sin mermas registradas para esta fecha.
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-3xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">
                          {entry.item?.name || entry.productName}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-zinc-500">
                          {entry.quantityGrams} g · {entry.source}
                        </p>

                        {entry.comment && (
                          <p className="mt-2 rounded-2xl bg-zinc-50 p-3 text-sm font-bold text-zinc-600">
                            {entry.comment}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-[#10B557]">
                          {formatPrice(entry.amount)}
                        </p>

                        <button
                          type="button"
                          onClick={() => deleteWaste(entry.id)}
                          className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
