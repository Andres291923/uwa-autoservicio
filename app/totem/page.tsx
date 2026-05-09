"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  active: boolean;
  order: number;
  category: Category;
};

type CartItem = {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function TotemPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    try {
      setLoading(true);

      const response = await fetch("/api/products");
      const data = await response.json();

      if (Array.isArray(data)) {
        setProducts(data.filter((product) => product.active));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error(error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.productId === product.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(id: number) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8 text-zinc-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            ÜWA Autoservicio
          </p>
          <h1 className="mt-2 text-5xl font-black">Elige tus productos</h1>
        </div>

        <a
          href="/"
          className="rounded-xl border border-zinc-300 px-5 py-3 font-bold"
        >
          Volver
        </a>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          {loading && (
            <div className="rounded-3xl bg-zinc-100 p-10 text-center">
              <p className="text-xl font-black">Cargando productos...</p>
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="rounded-3xl bg-zinc-100 p-10 text-center">
              <p className="text-2xl font-black">No hay productos activos</p>
              <p className="mt-2 text-zinc-500">
                Crea productos desde el panel administrador.
              </p>
              <a
                href="/admin"
                className="mt-6 inline-block rounded-2xl bg-[#10B557] px-6 py-3 font-black text-white"
              >
                Ir al admin
              </a>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-5xl">🥗</div>
                        <p className="mt-2 text-xs font-black uppercase text-zinc-400">
                          Sin foto
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-700">
                    {product.category.name}
                  </div>

                  <h2 className="text-2xl font-black">{product.name}</h2>

                  {product.description && (
                    <p className="mt-2 min-h-12 text-sm text-zinc-600">
                      {product.description}
                    </p>
                  )}

                  <p className="mt-4 text-3xl font-black text-[#10B557]">
                    {formatPrice(product.price)}
                  </p>

                  <button
                    onClick={() => addToCart(product)}
                    className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white"
                  >
                    Agregar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black">Tu pedido</h2>

          {cart.length === 0 ? (
            <p className="mt-4 text-zinc-500">
              Todavía no agregas productos.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold text-zinc-500">
                        Cantidad: {item.quantity}
                      </p>
                      <p className="mt-1 font-black text-[#10B557]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xl font-black">Total</span>
              <span className="text-3xl font-black text-[#10B557]">
                {formatPrice(total)}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              className={`mt-5 w-full rounded-2xl py-4 text-lg font-black ${
                cart.length > 0
                  ? "bg-[#10B557] text-white"
                  : "bg-zinc-200 text-zinc-500"
              }`}
            >
              Confirmar pedido
            </button>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="mt-3 w-full rounded-2xl border border-zinc-300 py-3 text-sm font-black"
              >
                Vaciar pedido
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}