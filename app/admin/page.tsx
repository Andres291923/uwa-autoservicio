"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  order: number;
  active: boolean;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  order: number;
  active: boolean;
  category: Category;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productOrder, setProductOrder] = useState("0");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productActive, setProductActive] = useState(true);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(
    null
  );

  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const [categoryMessage, setCategoryMessage] = useState("");
  const [productMessage, setProductMessage] = useState("");

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  async function loadProducts() {
    const response = await fetch("/api/products");
    const data = await response.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  async function loadData() {
    await Promise.all([loadCategories(), loadProducts()]);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductImageUrl("");
    setProductOrder("0");
    setProductCategoryId("");
    setProductActive(true);
    setProductMessage("");
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDescription(product.description || "");
    setProductPrice(String(product.price));
    setProductImageUrl(product.imageUrl || "");
    setProductOrder(String(product.order));
    setProductCategoryId(String(product.category.id));
    setProductActive(product.active);
    setProductMessage("Editando producto seleccionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingCategory(true);
      setCategoryMessage("");

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          order: Number(categoryOrder),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCategoryMessage(data.error || "No se pudo crear la categoría.");
        return;
      }

      setCategoryName("");
      setCategoryOrder("0");
      setCategoryMessage("Categoría creada correctamente.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setCategoryMessage("Error al crear categoría.");
    } finally {
      setLoadingCategory(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingProduct(true);
      setProductMessage("");

      const method = editingProductId ? "PUT" : "POST";

      const response = await fetch("/api/products", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProductId,
          name: productName,
          description: productDescription,
          price: Number(productPrice),
          imageUrl: productImageUrl,
          order: Number(productOrder),
          categoryId: Number(productCategoryId),
          active: productActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProductMessage(data.error || "No se pudo guardar el producto.");
        return;
      }

      setProductMessage(
        editingProductId
          ? "Producto editado correctamente."
          : "Producto creado correctamente."
      );

      resetProductForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      setProductMessage("Error al guardar producto.");
    } finally {
      setLoadingProduct(false);
    }
  }

  async function toggleProductActive(product: Product) {
    try {
      setUpdatingProductId(product.id);

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          active: !product.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "No se pudo actualizar el producto.");
        return;
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el producto.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Panel Admin
            </p>
            <h1 className="mt-1 text-3xl font-black">Administración ÜWA</h1>
          </div>

          <a
            href="/"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
          >
            Volver
          </a>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[#10B557] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase opacity-80">
              Categorías
            </p>
            <h2 className="mt-2 text-4xl font-black">{categories.length}</h2>
            <p className="mt-1 text-sm font-semibold">Creadas desde admin</p>
          </div>

          <div className="rounded-2xl bg-[#10B557] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase opacity-80">
              Productos
            </p>
            <h2 className="mt-2 text-4xl font-black">{products.length}</h2>
            <p className="mt-1 text-sm font-semibold">Creados desde admin</p>
          </div>

          <div className="rounded-2xl bg-white p-5 text-zinc-900 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Modificadores
            </p>
            <h2 className="mt-2 text-4xl font-black">0</h2>
            <p className="mt-1 text-sm font-semibold">Próximo paso</p>
          </div>
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={createCategory}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-black">Crear categoría</h2>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre
              </span>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ej: Bowls, Bebidas, Postres"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Orden
              </span>
              <input
                value={categoryOrder}
                onChange={(event) => setCategoryOrder(event.target.value)}
                type="number"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            {categoryMessage && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {categoryMessage}
              </p>
            )}

            <button
              disabled={loadingCategory}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loadingCategory ? "Guardando..." : "Guardar categoría"}
            </button>
          </form>

          <form
            onSubmit={saveProduct}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">
                {editingProductId ? "Editar producto" : "Crear producto"}
              </h2>

              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Categoría
              </span>
              <select
                value={productCategoryId}
                onChange={(event) => setProductCategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre
              </span>
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Ej: Bowl M Pollo"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Descripción
              </span>
              <input
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Ej: Base + verduras + proteína + salsas"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Precio
                </span>
                <input
                  value={productPrice}
                  onChange={(event) => setProductPrice(event.target.value)}
                  type="number"
                  placeholder="4200"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Orden
                </span>
                <input
                  value={productOrder}
                  onChange={(event) => setProductOrder(event.target.value)}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                URL imagen
              </span>
              <input
                value={productImageUrl}
                onChange={(event) => setProductImageUrl(event.target.value)}
                placeholder="Después haremos carga real de foto"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            {editingProductId && (
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                <input
                  type="checkbox"
                  checked={productActive}
                  onChange={(event) => setProductActive(event.target.checked)}
                />
                <span className="text-sm font-black">Producto activo</span>
              </label>
            )}

            {productMessage && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {productMessage}
              </p>
            )}

            <button
              disabled={loadingProduct}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loadingProduct
                ? "Guardando..."
                : editingProductId
                ? "Actualizar producto"
                : "Guardar producto"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Productos creados</h2>

          {products.length === 0 ? (
            <div className="mt-5 rounded-xl bg-zinc-100 p-6 text-center">
              <p className="text-lg font-black">Aún no hay productos</p>
              <p className="mt-1 text-sm text-zinc-500">
                Crea un producto desde el formulario.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-3 font-black">Producto</th>
                    <th className="p-3 font-black">Categoría</th>
                    <th className="p-3 font-black">Precio</th>
                    <th className="p-3 font-black">Orden</th>
                    <th className="p-3 font-black">Estado</th>
                    <th className="p-3 font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-zinc-200">
                      <td className="p-3 font-bold">{product.name}</td>

                      <td className="p-3">{product.category.name}</td>

                      <td className="p-3 font-black text-[#10B557]">
                        {formatPrice(product.price)}
                      </td>

                      <td className="p-3">{product.order}</td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="flex gap-2 p-3">
                        <button
                          onClick={() => startEditProduct(product)}
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => toggleProductActive(product)}
                          disabled={updatingProductId === product.id}
                          className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                            product.active ? "bg-red-500" : "bg-[#10B557]"
                          } disabled:bg-zinc-300`}
                        >
                          {updatingProductId === product.id
                            ? "Actualizando..."
                            : product.active
                            ? "Desactivar"
                            : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}