"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  type: "bowl" | "bebida";
};

type CartItem = {
  id: number;
  name: string;
  price: number;
  details: string[];
};

const products: Product[] = [
  {
    id: 1,
    name: "Bowl M Pollo",
    price: 4200,
    emoji: "🥗",
    type: "bowl",
  },
  {
    id: 2,
    name: "Bowl M Carne",
    price: 4400,
    emoji: "🥩",
    type: "bowl",
  },
  {
    id: 3,
    name: "Jumex Mango",
    price: 1500,
    emoji: "🧃",
    type: "bebida",
  },
];

const bases = ["Arroz", "Lechuga"];
const verduras = ["Zanahoria", "Betarraga", "Choclo", "Pepino", "Brócoli", "Repollo"];
const salsas = ["Salsa verde", "Cilantro", "Ajo", "Mostaza miel"];

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function TotemPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBase, setSelectedBase] = useState("");
  const [selectedVerduras, setSelectedVerduras] = useState<string[]>([]);
  const [selectedSalsas, setSelectedSalsas] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  function resetBuilder() {
    setSelectedProduct(null);
    setSelectedBase("");
    setSelectedVerduras([]);
    setSelectedSalsas([]);
  }

  function chooseProduct(product: Product) {
    if (product.type === "bebida") {
      setCart((current) => [
        ...current,
        {
          id: Date.now(),
          name: product.name,
          price: product.price,
          details: ["Bebida individual"],
        },
      ]);
      return;
    }

    setSelectedProduct(product);
    setSelectedBase("");
    setSelectedVerduras([]);
    setSelectedSalsas([]);
  }

  function toggleVerdura(option: string) {
    setSelectedVerduras((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }

      if (current.length >= 4) {
        return current;
      }

      return [...current, option];
    });
  }

  function toggleSalsa(option: string) {
    setSelectedSalsas((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, option];
    });
  }

  function addBowlToCart() {
    if (!selectedProduct) return;
    if (!selectedBase) return;
    if (selectedVerduras.length !== 4) return;
    if (selectedSalsas.length < 1) return;

    setCart((current) => [
      ...current,
      {
        id: Date.now(),
        name: selectedProduct.name,
        price: selectedProduct.price,
        details: [
          `Base: ${selectedBase}`,
          `Verduras: ${selectedVerduras.join(", ")}`,
          `Salsas: ${selectedSalsas.join(", ")}`,
        ],
      },
    ]);

    resetBuilder();
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  const canAddBowl =
    selectedProduct &&
    selectedBase &&
    selectedVerduras.length === 4 &&
    selectedSalsas.length >= 1;

  return (
    <main className="min-h-screen bg-white p-8 text-zinc-900">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            ÜWA Autoservicio
          </p>
          <h1 className="mt-2 text-5xl font-black">Arma tu bowl</h1>
        </div>

        <a
          href="/"
          className="rounded-xl border border-zinc-300 px-5 py-3 font-bold"
        >
          Volver
        </a>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <section>
          {!selectedProduct && (
            <div className="grid gap-6 md:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-3xl border border-zinc-200 p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-40 items-center justify-center rounded-2xl bg-zinc-100 text-6xl">
                    {product.emoji}
                  </div>

                  <h2 className="text-2xl font-black">{product.name}</h2>

                  <p className="mt-2 text-zinc-600">
                    {product.type === "bowl"
                      ? "Base + verduras + proteína + salsas."
                      : "Bebida individual."}
                  </p>

                  <p className="mt-4 text-3xl font-black text-[#10B557]">
                    {formatPrice(product.price)}
                  </p>

                  <button
                    onClick={() => chooseProduct(product)}
                    className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white"
                  >
                    {product.type === "bowl" ? "Elegir" : "Agregar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedProduct && (
            <div className="rounded-3xl border border-zinc-200 p-8 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#10B557]">
                    Armando pedido
                  </p>
                  <h2 className="mt-2 text-4xl font-black">
                    {selectedProduct.name}
                  </h2>
                  <p className="mt-2 text-2xl font-black text-[#10B557]">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>

                <button
                  onClick={resetBuilder}
                  className="rounded-xl border border-zinc-300 px-5 py-3 font-bold"
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="mb-3 text-2xl font-black">1. Elige tu base</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {bases.map((base) => (
                      <button
                        key={base}
                        onClick={() => setSelectedBase(base)}
                        className={`rounded-2xl border p-5 text-left text-xl font-black ${
                          selectedBase === base
                            ? "border-[#10B557] bg-[#10B557] text-white"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        {base}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-1 text-2xl font-black">
                    2. Elige 4 verduras
                  </h3>
                  <p className="mb-3 font-bold text-zinc-500">
                    Seleccionadas: {selectedVerduras.length}/4
                  </p>

                  <div className="grid gap-3 md:grid-cols-3">
                    {verduras.map((verdura) => (
                      <button
                        key={verdura}
                        onClick={() => toggleVerdura(verdura)}
                        className={`rounded-2xl border p-5 text-left font-black ${
                          selectedVerduras.includes(verdura)
                            ? "border-[#10B557] bg-[#10B557] text-white"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        {verdura}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-1 text-2xl font-black">
                    3. Elige hasta 2 salsas
                  </h3>
                  <p className="mb-3 font-bold text-zinc-500">
                    Seleccionadas: {selectedSalsas.length}/2
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    {salsas.map((salsa) => (
                      <button
                        key={salsa}
                        onClick={() => toggleSalsa(salsa)}
                        className={`rounded-2xl border p-5 text-left font-black ${
                          selectedSalsas.includes(salsa)
                            ? "border-[#10B557] bg-[#10B557] text-white"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        {salsa}
                      </button>
                    ))}
                  </div>
                </section>

                <button
                  onClick={addBowlToCart}
                  disabled={!canAddBowl}
                  className={`w-full rounded-2xl py-5 text-xl font-black ${
                    canAddBowl
                      ? "bg-[#10B557] text-white"
                      : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  Agregar al pedido
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-3xl font-black">Tu pedido</h2>

          {cart.length === 0 && (
            <p className="mt-4 text-zinc-500">Todavía no agregas productos.</p>
          )}

          <div className="mt-6 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="mt-1 font-black text-[#10B557]">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1 text-sm font-black text-red-600"
                  >
                    Quitar
                  </button>
                </div>

                <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                  {item.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xl font-black">Total</span>
              <span className="text-3xl font-black text-[#10B557]">
                {formatPrice(total)}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              className={`mt-6 w-full rounded-2xl py-5 text-xl font-black ${
                cart.length > 0
                  ? "bg-[#10B557] text-white"
                  : "bg-zinc-200 text-zinc-500"
              }`}
            >
              Confirmar pedido
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}