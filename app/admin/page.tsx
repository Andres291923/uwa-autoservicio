"use client";

import { useEffect, useState } from "react";

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

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
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

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingProduct(true);
      setProductMessage("");

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: productName,
          description: productDescription,
          price: Number(productPrice),
          imageUrl: productImageUrl,
          order: Number(productOrder),
          categoryId: Number(productCategoryId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProductMessage(data.error || "No se pudo crear el producto.");
        return;
      }

      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductImageUrl("");
      setProductOrder("0");
      setProductCategoryId("");
      setProductMessage("Producto creado correctamente.");
      await loadProducts();
    } catch (error) {
      console.error(error);
      setProductMessage("Error al crear producto.");
    } finally {
      setLoadingProduct(false);
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
            onSubmit={createProduct}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-black">Crear producto</h2>

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

            {productMessage && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {productMessage}
              </p>
            )}

            <button
              disabled={loadingProduct}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loadingProduct ? "Guardando..." : "Guardar producto"}
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
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          {product.active ? "Activo" : "Inactivo"}
                        </span>
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