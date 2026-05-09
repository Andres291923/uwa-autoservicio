"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ModifierOption = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  order: number;
  active: boolean;
};

type ModifierTemplate = {
  id: number;
  name: string;
  order: number;
  active: boolean;
  options: ModifierOption[];
};

type ProductModifierGroup = {
  id: number;
  min: number;
  max: number;
  required: boolean;
  order: number;
  active: boolean;
  template: ModifierTemplate;
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
  modifierGroups: ProductModifierGroup[];
};

type CartModifierOption = {
  id: number;
  name: string;
  price: number;
};

type CartModifierGroup = {
  groupName: string;
  options: CartModifierOption[];
};

type CartItem = {
  id: number;
  productId: number;
  name: string;
  basePrice: number;
  quantity: number;
  modifiers: CartModifierGroup[];
  total: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

function getActiveModifierGroups(product: Product | null) {
  if (!product) return [];

  return product.modifierGroups
    .filter((group) => group.active && group.template.active)
    .map((group) => ({
      ...group,
      template: {
        ...group.template,
        options: group.template.options.filter((option) => option.active),
      },
    }))
    .filter((group) => group.template.options.length > 0);
}

function getEffectiveMin(group: ProductModifierGroup) {
  if (group.required && group.min === 0) return 1;
  return group.min;
}

export default function TotemPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<
    Record<number, number[]>
  >({});

  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

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

  const activeModifierGroups = useMemo(
    () => getActiveModifierGroups(selectedProduct),
    [selectedProduct]
  );

  const selectedProductTotal = useMemo(() => {
    if (!selectedProduct) return 0;

    let total = selectedProduct.price;

    activeModifierGroups.forEach((group) => {
      const selectedIds = selectedOptionsByGroup[group.id] || [];

      selectedIds.forEach((optionId) => {
        const option = group.template.options.find(
          (item) => item.id === optionId
        );

        if (option) {
          total += option.price;
        }
      });
    });

    return total;
  }, [selectedProduct, selectedOptionsByGroup, activeModifierGroups]);

  const canAddSelectedProduct = useMemo(() => {
    if (!selectedProduct) return false;

    return activeModifierGroups.every((group) => {
      const selectedIds = selectedOptionsByGroup[group.id] || [];
      const min = getEffectiveMin(group);
      const max = group.max;

      if (selectedIds.length < min) return false;
      if (max > 0 && selectedIds.length > max) return false;

      return true;
    });
  }, [selectedProduct, selectedOptionsByGroup, activeModifierGroups]);

  function openProduct(product: Product) {
    setOrderMessage("");

    const groups = getActiveModifierGroups(product);

    if (groups.length === 0) {
      addSimpleProductToCart(product);
      return;
    }

    setSelectedProduct(product);
    setSelectedOptionsByGroup({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeProductBuilder() {
    setSelectedProduct(null);
    setSelectedOptionsByGroup({});
  }

  function toggleOption(group: ProductModifierGroup, optionId: number) {
    setSelectedOptionsByGroup((current) => {
      const selectedIds = current[group.id] || [];
      const alreadySelected = selectedIds.includes(optionId);

      if (alreadySelected) {
        return {
          ...current,
          [group.id]: selectedIds.filter((id) => id !== optionId),
        };
      }

      if (group.max === 1) {
        return {
          ...current,
          [group.id]: [optionId],
        };
      }

      if (group.max > 0 && selectedIds.length >= group.max) {
        return current;
      }

      return {
        ...current,
        [group.id]: [...selectedIds, optionId],
      };
    });
  }

  function addSimpleProductToCart(product: Product) {
    setCart((currentCart) => [
      ...currentCart,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        quantity: 1,
        modifiers: [],
        total: product.price,
      },
    ]);
  }

  function addConfiguredProductToCart() {
    if (!selectedProduct || !canAddSelectedProduct) return;

    const modifiers: CartModifierGroup[] = activeModifierGroups
      .map((group) => {
        const selectedIds = selectedOptionsByGroup[group.id] || [];

        const options = selectedIds
          .map((optionId) =>
            group.template.options.find((option) => option.id === optionId)
          )
          .filter(Boolean) as ModifierOption[];

        return {
          groupName: group.template.name,
          options: options.map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
          })),
        };
      })
      .filter((group) => group.options.length > 0);

    setCart((currentCart) => [
      ...currentCart,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        productId: selectedProduct.id,
        name: selectedProduct.name,
        basePrice: selectedProduct.price,
        quantity: 1,
        modifiers,
        total: selectedProductTotal,
      },
    ]);

    closeProductBuilder();
  }

  function removeFromCart(id: number) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
    setOrderMessage("");
  }

  async function confirmOrder() {
    if (cart.length === 0) return;

    try {
      setConfirmingOrder(true);
      setOrderMessage("");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totemCode: "uwa-totem-local",
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            modifierOptionIds: item.modifiers.flatMap((group) =>
              group.options.map((option) => option.id)
            ),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOrderMessage(data.error || "No se pudo crear el pedido.");
        return;
      }

      setCart([]);
      setSelectedProduct(null);
      setSelectedOptionsByGroup({});
      setOrderMessage(`Pedido #${data.orderNumber} enviado a cocina.`);
    } catch (error) {
      console.error(error);
      setOrderMessage("Error al confirmar pedido.");
    } finally {
      setConfirmingOrder(false);
    }
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.total * item.quantity,
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
          <h1 className="mt-2 text-5xl font-black">
            {selectedProduct ? "Personaliza tu producto" : "Elige tus productos"}
          </h1>
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

          {!loading && !selectedProduct && products.length === 0 && (
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

          {!loading && !selectedProduct && products.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const hasModifiers = getActiveModifierGroups(product).length > 0;

                return (
                  <article
                    key={product.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <button
                      onClick={() => openProduct(product)}
                      className="block w-full text-left"
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
                            <div className="text-5xl">🛒</div>
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

                      {hasModifiers && (
                        <p className="mt-2 text-xs font-black uppercase text-zinc-400">
                          Requiere selección
                        </p>
                      )}
                    </button>

                    <button
                      onClick={() => openProduct(product)}
                      className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white"
                    >
                      {hasModifiers ? "Elegir" : "Agregar"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {selectedProduct && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <button
                    onClick={closeProductBuilder}
                    className="mb-4 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-black"
                  >
                    ← Volver a productos
                  </button>

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                    Producto seleccionado
                  </p>
                  <h2 className="mt-2 text-4xl font-black">
                    {selectedProduct.name}
                  </h2>
                  <p className="mt-2 text-2xl font-black text-[#10B557]">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>

                <div className="hidden h-32 w-32 overflow-hidden rounded-2xl bg-zinc-100 md:block">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">
                      🛒
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {activeModifierGroups.map((group) => {
                  const selectedIds = selectedOptionsByGroup[group.id] || [];
                  const min = getEffectiveMin(group);
                  const max = group.max;
                  const valid =
                    selectedIds.length >= min &&
                    (max <= 0 || selectedIds.length <= max);

                  return (
                    <section
                      key={group.id}
                      className={`rounded-3xl border p-5 ${
                        valid
                          ? "border-zinc-200"
                          : "border-yellow-300 bg-yellow-50"
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-black">
                            {group.template.name}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-zinc-500">
                            Seleccionadas: {selectedIds.length}
                            {max > 0 ? `/${max}` : ""} · Mínimo: {min}
                            {group.required ? " · Obligatorio" : " · Opcional"}
                          </p>
                        </div>

                        {!valid && (
                          <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-yellow-800">
                            Falta seleccionar
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {group.template.options.map((option) => {
                          const selected = selectedIds.includes(option.id);

                          return (
                            <button
                              key={option.id}
                              onClick={() => toggleOption(group, option.id)}
                              className={`rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-[#10B557] bg-[#10B557] text-white"
                                  : "border-zinc-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
                                    selected ? "bg-white/20" : "bg-zinc-100"
                                  }`}
                                >
                                  {option.imageUrl ? (
                                    <img
                                      src={option.imageUrl}
                                      alt={option.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-2xl">+</span>
                                  )}
                                </div>

                                <div>
                                  <p className="font-black">{option.name}</p>
                                  {option.price > 0 && (
                                    <p
                                      className={`mt-1 text-sm font-black ${
                                        selected
                                          ? "text-white"
                                          : "text-[#10B557]"
                                      }`}
                                    >
                                      + {formatPrice(option.price)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="sticky bottom-4 mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-zinc-400">
                      Total producto
                    </p>
                    <p className="text-4xl font-black text-[#10B557]">
                      {formatPrice(selectedProductTotal)}
                    </p>
                  </div>

                  <button
                    onClick={addConfiguredProductToCart}
                    disabled={!canAddSelectedProduct}
                    className={`rounded-2xl px-8 py-4 text-lg font-black ${
                      canAddSelectedProduct
                        ? "bg-[#10B557] text-white"
                        : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    Agregar al pedido
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black">Tu pedido</h2>

          {orderMessage && (
            <div className="mt-4 rounded-2xl bg-green-100 p-4 font-black text-green-700">
              {orderMessage}
            </div>
          )}

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
                        {formatPrice(item.total * item.quantity)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                    >
                      Quitar
                    </button>
                  </div>

                  {item.modifiers.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                      {item.modifiers.map((group) => (
                        <div key={group.groupName}>
                          <p className="text-xs font-black uppercase text-zinc-400">
                            {group.groupName}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {group.options
                              .map((option) =>
                                option.price > 0
                                  ? `${option.name} (+${formatPrice(
                                      option.price
                                    )})`
                                  : option.name
                              )
                              .join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xl font-black">Total</span>
              <span className="text-3xl font-black text-[#10B557]">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <button
              onClick={confirmOrder}
              disabled={cart.length === 0 || confirmingOrder}
              className={`mt-5 w-full rounded-2xl py-4 text-lg font-black ${
                cart.length > 0 && !confirmingOrder
                  ? "bg-[#10B557] text-white"
                  : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {confirmingOrder ? "Enviando pedido..." : "Confirmar pedido"}
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