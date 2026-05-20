"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  price?: number;
  active?: boolean;
};

type ModifierOption = {
  id: number;
  name: string;
  price?: number;
  active?: boolean;
};

type ModifierTemplate = {
  id: number;
  name: string;
  options: ModifierOption[];
};

type StockMovement = {
  id: number;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  createdAt: string;
};

type StockItem = {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
  active: boolean;
  productId?: number | null;
  modifierOptionId?: number | null;
  product?: {
    id: number;
    name: string;
  } | null;
  modifierOption?: {
    id: number;
    name: string;
    template?: {
      id: number;
      name: string;
    } | null;
  } | null;
  movements?: StockMovement[];
};

const emptyForm = {
  name: "",
  currentStock: "0",
  minStock: "0",
  productId: "none",
  modifierOptionId: "none",
};

export default function BeverageStockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifierTemplates, setModifierTemplates] = useState<ModifierTemplate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [purchaseAmounts, setPurchaseAmounts] = useState<Record<number, string>>({});
  const [manualStocks, setManualStocks] = useState<Record<number, string>>({});

  const modifierOptions = useMemo(() => {
    return modifierTemplates.flatMap((template) =>
      (template.options || []).map((option) => ({
        ...option,
        label: `${template.name} → ${option.name}`,
      }))
    );
  }, [modifierTemplates]);

  async function loadData() {
    try {
      setLoading(true);

      const [stockRes, productsRes, modifiersRes] = await Promise.all([
        fetch("/api/beverage-stock", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/modifier-templates", { cache: "no-store" }),
      ]);

      const [stockData, productsData, modifiersData] = await Promise.all([
        stockRes.json(),
        productsRes.json(),
        modifiersRes.json(),
      ]);

      setStockItems(Array.isArray(stockData) ? stockData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setModifierTemplates(Array.isArray(modifiersData) ? modifiersData : []);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createStockItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const res = await fetch("/api/beverage-stock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        currentStock: Number(form.currentStock),
        minStock: Number(form.minStock),
        productId: form.productId,
        modifierOptionId: form.modifierOptionId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo crear el stock.");
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    await loadData();
    setSaving(false);
  }

  async function addStock(stockItem: StockItem) {
    const quantity = Number(purchaseAmounts[stockItem.id] || 0);

    if (quantity <= 0) {
      alert("Ingresa una cantidad mayor a 0.");
      return;
    }

    const res = await fetch("/api/beverage-stock", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: stockItem.id,
        action: "add_stock",
        quantity,
        reason: "Compra / ingreso desde admin",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo sumar stock.");
      return;
    }

    setPurchaseAmounts((prev) => ({ ...prev, [stockItem.id]: "" }));
    await loadData();
  }

  async function setManualStock(stockItem: StockItem) {
    const currentStock = Number(manualStocks[stockItem.id]);

    if (!Number.isFinite(currentStock) || currentStock < 0) {
      alert("Ingresa un stock válido.");
      return;
    }

    const res = await fetch("/api/beverage-stock", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: stockItem.id,
        action: "set_stock",
        currentStock,
        reason: "Ajuste manual desde admin",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo ajustar el stock.");
      return;
    }

    setManualStocks((prev) => ({ ...prev, [stockItem.id]: "" }));
    await loadData();
  }

  async function toggleActive(stockItem: StockItem) {
    const res = await fetch("/api/beverage-stock", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: stockItem.id,
        action: "update",
        name: stockItem.name,
        minStock: stockItem.minStock,
        active: !stockItem.active,
        productId: stockItem.productId || "none",
        modifierOptionId: stockItem.modifierOptionId || "none",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo actualizar.");
      return;
    }

    await loadData();
  }

  async function deleteStock(stockItem: StockItem) {
    const ok = confirm(`¿Eliminar el stock "${stockItem.name}"?`);

    if (!ok) return;

    const res = await fetch("/api/beverage-stock", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: stockItem.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo eliminar.");
      return;
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-green-600">
            Inventario simple
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Stock de bebidas, jugos y aguas
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Carga las bebidas compradas y conéctalas a un producto directo o a una opción de modificador.
            Después las descontaremos automáticamente cuando se venda desde tótem, pedido online o empresas.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Crear nuevo stock</h2>

          <form onSubmit={createStockItem} className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Nombre</label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ej: Agua mineral sin gas 500cc"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Stock actual</label>
              <input
                type="number"
                min="0"
                value={form.currentStock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currentStock: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Stock mínimo</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minStock: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div className="flex items-end">
              <button
                disabled={saving}
                className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Crear stock"}
              </button>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Conectar a producto directo
              </label>
              <select
                value={form.productId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, productId: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500"
              >
                <option value="none">Sin producto asociado</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-slate-700">
                Conectar a opción de modificador
              </label>
              <select
                value={form.modifierOptionId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    modifierOptionId: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500"
              >
                <option value="none">Sin modificador asociado</option>
                {modifierOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-900">Stock actual</h2>
            <button
              onClick={loadData}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Cargando stock...</p>
          ) : stockItems.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Todavía no hay bebidas registradas.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bebida</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Conectado a</th>
                    <th className="px-4 py-3">Sumar compra</th>
                    <th className="px-4 py-3">Ajuste manual</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockItems.map((item) => {
                    const isLowStock = item.currentStock <= item.minStock;

                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-900">{item.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Mínimo: {item.minStock}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              isLowStock
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.currentStock} unidades
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          <div>
                            <span className="font-bold">Producto:</span>{" "}
                            {item.product?.name || "No conectado"}
                          </div>
                          <div className="mt-1">
                            <span className="font-bold">Modificador:</span>{" "}
                            {item.modifierOption
                              ? `${item.modifierOption.template?.name || "Grupo"} → ${item.modifierOption.name}`
                              : "No conectado"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              value={purchaseAmounts[item.id] || ""}
                              onChange={(event) =>
                                setPurchaseAmounts((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Ej: 24"
                              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                            />
                            <button
                              onClick={() => addStock(item)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                            >
                              Sumar
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              value={manualStocks[item.id] || ""}
                              onChange={(event) =>
                                setManualStocks((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Real"
                              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                            />
                            <button
                              onClick={() => setManualStock(item)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                            >
                              Ajustar
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleActive(item)}
                            className={`rounded-xl px-3 py-2 text-xs font-black ${
                              item.active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() => deleteStock(item)}
                            className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
