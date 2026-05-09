"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  order: number;
  active: boolean;
};

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(data);
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        order: Number(order),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "No se pudo crear la categoría.");
      setLoading(false);
      return;
    }

    setName("");
    setOrder("0");
    setMessage("Categoría creada correctamente.");
    await loadCategories();
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
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

          <div className="rounded-2xl bg-white p-5 text-zinc-900 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Productos
            </p>
            <h2 className="mt-2 text-4xl font-black">0</h2>
            <p className="mt-1 text-sm font-semibold">Próximo paso</p>
          </div>

          <div className="rounded-2xl bg-white p-5 text-zinc-900 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Modificadores
            </p>
            <h2 className="mt-2 text-4xl font-black">0</h2>
            <p className="mt-1 text-sm font-semibold">Próximo paso</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
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
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Bowls, Bebidas, Postres"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Orden
              </span>
              <input
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                type="number"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            {message && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {message}
              </p>
            )}

            <button
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loading ? "Guardando..." : "Guardar categoría"}
            </button>
          </form>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Categorías creadas</h2>

            {categories.length === 0 ? (
              <div className="mt-5 rounded-xl bg-zinc-100 p-6 text-center">
                <p className="text-lg font-black">Aún no hay categorías</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Esta es la caja vacía. Crea la primera categoría desde el
                  formulario.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="p-3 font-black">Nombre</th>
                      <th className="p-3 font-black">Slug</th>
                      <th className="p-3 font-black">Orden</th>
                      <th className="p-3 font-black">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categories.map((category) => (
                      <tr
                        key={category.id}
                        className="border-t border-zinc-200"
                      >
                        <td className="p-3 font-bold">{category.name}</td>
                        <td className="p-3 text-zinc-500">{category.slug}</td>
                        <td className="p-3">{category.order}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                            {category.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}