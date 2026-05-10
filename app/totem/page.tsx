"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  order?: number;
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

type TotemStep = "catalog" | "summary" | "customer";

type BusinessSettings = {
  id: number;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  kioskSubtitle: string;
  kioskTitle: string;
};

const defaultSettings: BusinessSettings = {
  id: 1,
  businessName: "Mi negocio",
  logoUrl: null,
  primaryColor: "#10B557",
  kioskSubtitle: "Autoservicio",
  kioskTitle: "Elige tus productos",
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
  const [step, setStep] = useState<TotemStep>("catalog");
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
    "all"
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<
    Record<number, number[]>
  >({});

  const [customerName, setCustomerName] = useState("");
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

  const loggedCustomerName = "";

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      setSettings({
        ...defaultSettings,
        ...data,
      });
    } catch (error) {
      console.error(error);
      setSettings(defaultSettings);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);

      const response = await fetch("/api/products");
      const data = await response.json();

      setProducts(Array.isArray(data) ? data.filter((p) => p.active) : []);
    } catch (error) {
      console.error(error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const map = new Map<number, Category>();

    products.forEach((product) => {
      map.set(product.category.id, product.category);
    });

    return Array.from(map.values()).sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;

      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (selectedCategoryId === "all") return products;

    return products.filter(
      (product) => product.category.id === selectedCategoryId
    );
  }, [products, selectedCategoryId]);

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

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.total * item.quantity,
    0
  );

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

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
    setCustomerMessage("");
    setStep("catalog");
  }

  function goToSummary() {
    if (cart.length === 0) return;

    setSelectedProduct(null);
    setStep("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToCustomerStep() {
    if (cart.length === 0) return;

    setStep("customer");
    setCustomerMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmOrder() {
    if (cart.length === 0) return;

    const finalCustomerName = (loggedCustomerName || customerName).trim();

    if (!finalCustomerName) {
      setCustomerMessage("Debes ingresar el nombre del cliente.");
      return;
    }

    try {
      setConfirmingOrder(true);
      setOrderMessage("");
      setCustomerMessage("");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: finalCustomerName,
          totemCode: "totem-local",
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
        setCustomerMessage(data.error || "No se pudo crear el pedido.");
        return;
      }

      setCart([]);
      setSelectedProduct(null);
      setSelectedOptionsByGroup({});
      setCustomerName("");
      setStep("catalog");
      setOrderMessage(`Pedido #${data.orderNumber} enviado a cocina.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setCustomerMessage("Error al confirmar pedido.");
    } finally {
      setConfirmingOrder(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              style={{
                width: 58,
                height: 58,
                minWidth: 58,
                maxWidth: 58,
                maxHeight: 58,
                overflow: "hidden",
                borderRadius: 18,
                background: "#f4f4f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  style={{
                    maxWidth: 48,
                    maxHeight: 48,
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <span className="text-base font-black text-zinc-400">
                  {settings.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p
                className="truncate text-[11px] font-black uppercase tracking-[0.22em]"
                style={{ color: settings.primaryColor }}
              >
                {settings.businessName} {settings.kioskSubtitle}
              </p>

              <h1 className="truncate text-[30px] font-black leading-none tracking-tight">
                {selectedProduct
                  ? "Personaliza tu producto"
                  : step === "summary"
                  ? "Resumen de compra"
                  : step === "customer"
                  ? "Datos del pedido"
                  : settings.kioskTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center shadow-sm">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-sm font-black">
                QR
              </div>
              <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">
                Identifícate
              </p>
            </button>

            <a
              href="/"
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-black shadow-sm"
            >
              Volver
            </a>
          </div>
        </div>
      </header>

      {orderMessage && (
        <div className="mx-5 mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-base font-black text-green-700">
          {orderMessage}
        </div>
      )}

      {selectedProduct ? (
        <section className="p-5 pb-28">
          <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={closeProductBuilder}
                  className="mb-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black"
                >
                  ← Volver
                </button>

                <p
                  className="text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: settings.primaryColor }}
                >
                  Producto seleccionado
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selectedProduct.name}
                </h2>

                <p
                  className="mt-2 text-2xl font-black"
                  style={{ color: settings.primaryColor }}
                >
                  {formatPrice(selectedProduct.price)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
                    className={`rounded-3xl border p-4 ${
                      valid
                        ? "border-zinc-200 bg-white"
                        : "border-yellow-300 bg-yellow-50"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">
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

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.template.options.map((option) => {
                        const selected = selectedIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleOption(group, option.id)}
                            className="relative rounded-2xl border bg-white p-3 text-left transition"
                            style={{
                              borderColor: selected
                                ? settings.primaryColor
                                : "#e4e4e7",
                              boxShadow: selected
                                ? `0 0 0 2px ${settings.primaryColor}22`
                                : "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                style={{
                                  width: "62px",
                                  height: "62px",
                                  minWidth: "62px",
                                  maxWidth: "62px",
                                  minHeight: "62px",
                                  maxHeight: "62px",
                                  overflow: "hidden",
                                  borderRadius: "16px",
                                  background: "#ffffff",
                                  border: "1px solid #f1f1f1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {option.imageUrl ? (
                                  <img
                                    src={option.imageUrl}
                                    alt={option.name}
                                    style={{
                                      maxWidth: "54px",
                                      maxHeight: "54px",
                                      width: "auto",
                                      height: "auto",
                                      objectFit: "contain",
                                      objectPosition: "center",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "22px",
                                      fontWeight: 900,
                                      color: "#a1a1aa",
                                    }}
                                  >
                                    +
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-black text-zinc-950">
                                  {option.name}
                                </p>

                                {option.price > 0 && (
                                  <p
                                    className="mt-1 text-sm font-black"
                                    style={{ color: settings.primaryColor }}
                                  >
                                    + {formatPrice(option.price)}
                                  </p>
                                )}
                              </div>

                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  minWidth: "24px",
                                  borderRadius: "999px",
                                  border: selected
                                    ? "none"
                                    : "2px solid #d4d4d8",
                                  background: selected
                                    ? settings.primaryColor
                                    : "#ffffff",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  fontWeight: 900,
                                }}
                              >
                                {selected ? "✓" : ""}
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

            <div className="sticky bottom-4 mt-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
                    Total producto
                  </p>

                  <p
                    className="text-3xl font-black"
                    style={{ color: settings.primaryColor }}
                  >
                    {formatPrice(selectedProductTotal)}
                  </p>
                </div>

                <button
                  onClick={addConfiguredProductToCart}
                  disabled={!canAddSelectedProduct}
                  className="rounded-2xl px-7 py-4 text-base font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
                  style={{
                    background: canAddSelectedProduct
                      ? settings.primaryColor
                      : undefined,
                  }}
                >
                  Agregar al pedido
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : step === "summary" ? (
        <section className="p-5 pb-28">
          <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-3xl font-black">Resumen compra</h2>

              <button
                onClick={() => setStep("catalog")}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black"
              >
                Seguir comprando
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-zinc-500">No hay productos en el pedido.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black">
                          {item.quantity}x {item.name}
                        </h3>

                        <p
                          className="mt-1 text-xl font-black"
                          style={{ color: settings.primaryColor }}
                        >
                          {formatPrice(item.total * item.quantity)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600"
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
                  </article>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-5">
              <p className="text-2xl font-black">Total</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(cartTotal)}
              </p>
            </div>

            <button
              onClick={goToCustomerStep}
              disabled={cart.length === 0}
              className="mt-5 w-full rounded-2xl py-4 text-lg font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
              style={{
                background: cart.length > 0 ? settings.primaryColor : undefined,
              }}
            >
              Siguiente
            </button>
          </div>
        </section>
      ) : step === "customer" ? (
        <section className="p-5 pb-28">
          <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-3xl font-black">Datos del pedido</h2>

              <button
                onClick={() => setStep("summary")}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black"
              >
                Volver
              </button>
            </div>

            {loggedCustomerName ? (
              <div className="rounded-3xl bg-green-50 p-5">
                <p className="text-xs font-black uppercase text-green-700">
                  Cliente identificado
                </p>

                <p className="mt-1 text-3xl font-black">
                  Hola, {loggedCustomerName} 👋
                </p>
              </div>
            ) : (
              <label className="block">
                <span className="text-sm font-black uppercase text-zinc-500">
                  Nombre obligatorio
                </span>

                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Ej: Andres"
                  className="mt-3 w-full rounded-2xl border border-zinc-300 px-5 py-4 text-2xl font-black outline-none"
                />

                <p className="mt-2 text-sm font-bold text-zinc-500">
                  Este nombre aparecera en cocina y en la comanda.
                </p>
              </label>
            )}

            {customerMessage && (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 font-black text-red-600">
                {customerMessage}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between rounded-3xl bg-zinc-100 p-5">
              <p className="text-2xl font-black">Total</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(cartTotal)}
              </p>
            </div>

            <button
              onClick={confirmOrder}
              disabled={
                cart.length === 0 ||
                confirmingOrder ||
                (!loggedCustomerName && !customerName.trim())
              }
              className="mt-5 w-full rounded-2xl py-5 text-xl font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
              style={{
                background:
                  cart.length > 0 &&
                  !confirmingOrder &&
                  (loggedCustomerName || customerName.trim())
                    ? settings.primaryColor
                    : undefined,
              }}
            >
              {confirmingOrder ? "Enviando pedido..." : "Confirmar pedido"}
            </button>

            <button
              onClick={clearCart}
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-4 text-sm font-black"
            >
              Cancelar pedido
            </button>
          </div>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "190px 1fr",
            minHeight: "calc(100vh - 83px)",
          }}
        >
          <aside className="border-r border-zinc-100 bg-zinc-50 p-4">
            <h2 className="mb-4 text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">
              Categorías
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className="w-full rounded-2xl px-4 py-4 text-left text-sm font-black uppercase"
                style={{
                  background:
                    selectedCategoryId === "all"
                      ? settings.primaryColor
                      : "white",
                  color: selectedCategoryId === "all" ? "white" : "#27272a",
                }}
              >
                Todo
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className="w-full rounded-2xl px-4 py-4 text-left text-sm font-black uppercase"
                  style={{
                    background:
                      selectedCategoryId === category.id
                        ? settings.primaryColor
                        : "white",
                    color:
                      selectedCategoryId === category.id ? "white" : "#27272a",
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </aside>

          <section className="bg-white p-5 pb-36">
            {loading && (
              <div className="rounded-3xl bg-zinc-50 p-10 text-center">
                <p className="text-xl font-black">Cargando productos...</p>
              </div>
            )}

            {!loading && visibleProducts.length === 0 && (
              <div className="rounded-3xl bg-zinc-50 p-10 text-center">
                <p className="text-2xl font-black">No hay productos activos</p>

                <p className="mt-2 text-zinc-500">
                  Crea productos desde el panel administrador.
                </p>
              </div>
            )}

            {!loading && visibleProducts.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                {visibleProducts.map((product) => {
                  const hasModifiers =
                    getActiveModifierGroups(product).length > 0;

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
                      style={{
                        minHeight: "330px",
                        maxHeight: "330px",
                      }}
                    >
                      <button
                        onClick={() => openProduct(product)}
                        className="block w-full text-left"
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "150px",
                            minHeight: "150px",
                            maxHeight: "150px",
                            overflow: "hidden",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                objectPosition: "center",
                                display: "block",
                                padding: "10px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#a1a1aa",
                              }}
                            >
                              <div style={{ fontSize: "30px" }}>🛒</div>
                              <p
                                style={{
                                  marginTop: "4px",
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                }}
                              >
                                Sin foto
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div
                            className="mb-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase"
                            style={{
                              background: `${settings.primaryColor}20`,
                              color: settings.primaryColor,
                            }}
                          >
                            {product.category.name}
                          </div>

                          <h2 className="min-h-[48px] text-[20px] font-black leading-tight">
                            {product.name}
                          </h2>

                          {product.description && (
                            <p className="mt-1 min-h-[38px] text-sm leading-snug text-zinc-500">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div>
                              <p
                                className="text-[28px] font-black leading-none"
                                style={{ color: settings.primaryColor }}
                              >
                                {formatPrice(product.price)}
                              </p>

                              {hasModifiers && (
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                                  
                                </p>
                              )}
                            </div>

                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black text-white"
                              style={{ background: settings.primaryColor }}
                            >
                              +
                            </div>
                          </div>
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer
            style={{
              position: "fixed",
              right: "26px",
              bottom: "26px",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                overflow: "hidden",
                borderRadius: "28px",
                border: "1px solid #e4e4e7",
                background: "white",
                boxShadow: "0 18px 45px rgba(0,0,0,0.16)",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  minWidth: "150px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "#a1a1aa",
                  }}
                >
                  Total
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: "4px",
                    fontSize: "26px",
                    lineHeight: "28px",
                    fontWeight: 900,
                    color: settings.primaryColor,
                  }}
                >
                  {formatPrice(cartTotal)}
                </p>

                {cartQuantity > 0 && (
                  <p
                    style={{
                      margin: 0,
                      marginTop: "6px",
                      fontSize: "14px",
                      fontWeight: 900,
                      color: "#8a8a93",
                    }}
                  >
                    {cartQuantity} producto{cartQuantity > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <button
                onClick={goToSummary}
                disabled={cart.length === 0}
                style={{
                  minWidth: "210px",
                  border: "none",
                  background: cart.length > 0 ? settings.primaryColor : "#e4e4e7",
                  color: cart.length > 0 ? "white" : "#71717a",
                  fontSize: "24px",
                  fontWeight: 900,
                  padding: "0 28px",
                  cursor: cart.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Siguiente →
              </button>
            </div>
          </footer>
        </section>
      )}
    </main>
  );
}