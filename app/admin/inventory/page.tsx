"use client";

import { useEffect, useState } from "react";

type InventorySubcategory = {
  id: number;
  categoryId: number;
  name: string;
  order: number;
  active: boolean;
};

type InventoryItem = {
  id: number;
  categoryId: number;
  subcategoryId: number | null;
  name: string;
  unit: string;
  order: number;
  active: boolean;
  subcategory: InventorySubcategory | null;
};

type InventoryCategory = {
  id: number;
  name: string;
  order: number;
  active: boolean;
  subcategories: InventorySubcategory[];
  items: InventoryItem[];
};

function emptyItem() {
  return {
    id: null as number | null,
    categoryId: "",
    subcategoryId: "",
    name: "",
    unit: "",
    order: "0",
    active: true,
  };
}

export default function AdminInventoryPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [categoryActive, setCategoryActive] = useState(true);

  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryOrder, setSubcategoryOrder] = useState("0");
  const [subcategoryActive, setSubcategoryActive] = useState(true);

  const [itemForm, setItemForm] = useState(emptyItem());

  async function loadCategories() {
    const response = await fetch("/api/inventory/categories", {
      cache: "no-store",
    });

    const data = await response.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setMessage("");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar inventario.");
    } finally {
      setLoading(false);
    }
  }

  function resetCategory() {
    setCategoryId(null);
    setCategoryName("");
    setCategoryOrder("0");
    setCategoryActive(true);
  }

  function resetSubcategory() {
    setSubcategoryId(null);
    setSubcategoryCategoryId("");
    setSubcategoryName("");
    setSubcategoryOrder("0");
    setSubcategoryActive(true);
  }

  function resetItem() {
    setItemForm(emptyItem());
  }

  async function saveCategory() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/inventory/categories", {
        method: categoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoryId,
          name: categoryName,
          order: Number(categoryOrder),
          active: categoryActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar categoria.");
        return;
      }

      resetCategory();
      setMessage("Categoria guardada.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar categoria.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSubcategory() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/inventory/subcategories", {
        method: subcategoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subcategoryId,
          categoryId: Number(subcategoryCategoryId),
          name: subcategoryName,
          order: Number(subcategoryOrder),
          active: subcategoryActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar subcategoria.");
        return;
      }

      resetSubcategory();
      setMessage("Subcategoria guardada.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar subcategoria.");
    } finally {
      setLoading(false);
    }
  }

  async function saveItem() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/inventory/items", {
        method: itemForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemForm.id,
          categoryId: Number(itemForm.categoryId),
          subcategoryId: itemForm.subcategoryId ? Number(itemForm.subcategoryId) : null,
          name: itemForm.name,
          unit: itemForm.unit,
          order: Number(itemForm.order),
          active: itemForm.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar producto.");
        return;
      }

      resetItem();
      setMessage("Producto guardado.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar producto.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteResource(type: "categories" | "subcategories" | "items", id: number) {
    const ok = window.confirm("Eliminar definitivamente?");
    if (!ok) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/inventory/${type}?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo eliminar.");
        return;
      }

      setMessage("Eliminado correctamente.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("Error al eliminar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const selectedCategorySubcategories = categories.find(
    (category) => String(category.id) === String(itemForm.categoryId)
  )?.subcategories || [];

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Inventario
          </p>

          <h1 className="mt-1 text-4xl font-black">Inventario unico</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Crea categorias, subcategorias y productos para el cierre de turno.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/inventario"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Registro inventario
          </a>

          <a
            href="/admin/inventory/daily"
            className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 shadow-sm"
          >
            Ver inventario diario
          </a>

          <a
            href="/mermas"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Registrar mermas
          </a>

          <a
            href="/admin/inventory/waste-costs"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800 shadow-sm"
          >
            Costos mermas
          </a>
        </div>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">
            {categoryId ? "Editar categoria" : "Crear categoria"}
          </h2>

          <input
            suppressHydrationWarning
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Ej: Verduras"
            className="mt-5 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <input
            suppressHydrationWarning
            value={categoryOrder}
            onChange={(event) => setCategoryOrder(event.target.value)}
            type="number"
            placeholder="Orden"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={categoryActive}
              onChange={(event) => setCategoryActive(event.target.checked)}
            />
            <span className="text-sm font-black">Activa</span>
          </label>

          <button
            suppressHydrationWarning
            onClick={saveCategory}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            Guardar categoria
          </button>

          {categoryId && (
            <button
              suppressHydrationWarning
              onClick={resetCategory}
              className="mt-3 w-full rounded-2xl border border-zinc-300 py-3 text-sm font-black"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">
            {subcategoryId ? "Editar subcategoria" : "Crear subcategoria"}
          </h2>

          <select
            suppressHydrationWarning
            value={subcategoryCategoryId}
            onChange={(event) => setSubcategoryCategoryId(event.target.value)}
            className="mt-5 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          >
            <option value="">Seleccionar categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            suppressHydrationWarning
            value={subcategoryName}
            onChange={(event) => setSubcategoryName(event.target.value)}
            placeholder="Ej: Cocidas, Frescas, Abarrotes"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <input
            suppressHydrationWarning
            value={subcategoryOrder}
            onChange={(event) => setSubcategoryOrder(event.target.value)}
            type="number"
            placeholder="Orden"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={subcategoryActive}
              onChange={(event) => setSubcategoryActive(event.target.checked)}
            />
            <span className="text-sm font-black">Activa</span>
          </label>

          <button
            suppressHydrationWarning
            onClick={saveSubcategory}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            Guardar subcategoria
          </button>

          {subcategoryId && (
            <button
              suppressHydrationWarning
              onClick={resetSubcategory}
              className="mt-3 w-full rounded-2xl border border-zinc-300 py-3 text-sm font-black"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">
            {itemForm.id ? "Editar producto" : "Crear producto"}
          </h2>

          <select
            suppressHydrationWarning
            value={itemForm.categoryId}
            onChange={(event) =>
              setItemForm({ ...itemForm, categoryId: event.target.value, subcategoryId: "" })
            }
            className="mt-5 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          >
            <option value="">Seleccionar categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            suppressHydrationWarning
            value={itemForm.subcategoryId}
            onChange={(event) =>
              setItemForm({ ...itemForm, subcategoryId: event.target.value })
            }
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          >
            <option value="">Sin subcategoria</option>
            {selectedCategorySubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>

          <input
            suppressHydrationWarning
            value={itemForm.name}
            onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })}
            placeholder="Ej: Lechuga, Pollo, Arroz"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <input
            suppressHydrationWarning
            value={itemForm.unit}
            onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value })}
            placeholder="Unidad opcional: kg, bolsas, lexan, tarros"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <input
            suppressHydrationWarning
            value={itemForm.order}
            onChange={(event) => setItemForm({ ...itemForm, order: event.target.value })}
            type="number"
            placeholder="Orden"
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
          />

          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={itemForm.active}
              onChange={(event) => setItemForm({ ...itemForm, active: event.target.checked })}
            />
            <span className="text-sm font-black">Activo</span>
          </label>

          <button
            suppressHydrationWarning
            onClick={saveItem}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            Guardar producto
          </button>

          {itemForm.id && (
            <button
              suppressHydrationWarning
              onClick={resetItem}
              className="mt-3 w-full rounded-2xl border border-zinc-300 py-3 text-sm font-black"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Estructura creada</h2>

        <div className="mt-5 space-y-5">
          {categories.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 p-5 text-center font-bold text-zinc-500">
              Aun no hay categorias.
            </p>
          ) : (
            categories.map((category) => (
              <article key={category.id} className="rounded-3xl border border-zinc-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">{category.name}</h3>
                    <p className="text-sm font-bold text-zinc-500">
                      {category.items.length} productos - {category.subcategories.length} subcategorias
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      suppressHydrationWarning
                      onClick={() => {
                        setCategoryId(category.id);
                        setCategoryName(category.name);
                        setCategoryOrder(String(category.order));
                        setCategoryActive(category.active);
                      }}
                      className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white"
                    >
                      Editar
                    </button>

                    <button
                      suppressHydrationWarning
                      onClick={() => deleteResource("categories", category.id)}
                      className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {category.subcategories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.subcategories.map((subcategory) => (
                      <button
                        suppressHydrationWarning
                        key={subcategory.id}
                        onClick={() => {
                          setSubcategoryId(subcategory.id);
                          setSubcategoryCategoryId(String(subcategory.categoryId));
                          setSubcategoryName(subcategory.name);
                          setSubcategoryOrder(String(subcategory.order));
                          setSubcategoryActive(subcategory.active);
                        }}
                        className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-600"
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {category.items.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-zinc-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black">{item.name}</h4>
                          <p className="text-xs font-bold text-zinc-500">
                            {item.subcategory?.name || "Sin subcategoria"}
                            {item.unit ? ` - ${item.unit}` : ""}
                          </p>
                          <p className="mt-1 text-xs font-black">
                            {item.active ? "Activo" : "Inactivo"}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            suppressHydrationWarning
                            onClick={() =>
                              setItemForm({
                                id: item.id,
                                categoryId: String(item.categoryId),
                                subcategoryId: item.subcategoryId ? String(item.subcategoryId) : "",
                                name: item.name,
                                unit: item.unit || "",
                                order: String(item.order),
                                active: item.active,
                              })
                            }
                            className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white"
                          >
                            Editar
                          </button>

                          <button
                            suppressHydrationWarning
                            onClick={() => deleteResource("items", item.id)}
                            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

