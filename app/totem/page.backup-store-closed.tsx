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

type TotemStep = "catalog" | "summary" | "customer" | "payment";

type PaymentMethod = "debit_credit" | "food_benefit";

type BusinessSettings = {
  id: number;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  kioskSubtitle: string;
  kioskTitle: string;
  tipsEnabled: boolean;
  tipPercent: number;
};

const defaultSettings: BusinessSettings = {
  id: 1,
  businessName: "Mi negocio",
  logoUrl: null,
  primaryColor: "#10B557",
  kioskSubtitle: "Autoservicio",
  kioskTitle: "Elige tus productos",
  tipsEnabled: false,
  tipPercent: 10,
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [tipSelected, setTipSelected] = useState(false);

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

  const tipPercent = Math.max(0, Number(settings.tipPercent || 10));
  const tipAmount =
    settings.tipsEnabled && tipSelected
      ? Math.round(cartTotal * (tipPercent / 100))
      : 0;
  const finalTotal = cartTotal + tipAmount;

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
    setSelectedPaymentMethod(null);
    setTipSelected(false);
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

  function goToPaymentStep() {
    if (cart.length === 0) return;

    const finalCustomerName = (loggedCustomerName || customerName).trim();

    if (!finalCustomerName) {
      setCustomerMessage("Debes ingresar el nombre del cliente.");
      return;
    }

    setSelectedPaymentMethod(null);
    setCustomerMessage("");
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmOrder() {
    if (cart.length === 0) return;

    const finalCustomerName = (loggedCustomerName || customerName).trim();

    if (!finalCustomerName) {
      setCustomerMessage("Debes ingresar el nombre del cliente.");
      return;
    }

    if (!selectedPaymentMethod) {
      setCustomerMessage("Debes seleccionar un medio de pago.");
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
          paymentMethod: selectedPaymentMethod,
          tipAmount,
          orderSource: "totem",
          fulfillmentType: "immediate",
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
      setSelectedPaymentMethod(null);
      setTipSelected(false);
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
    <main className="min-h-screen overflow-x-hidden bg-white pb-[112px] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white px-3 py-2 shadow-sm">
        <div className="flex h-[70px] items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-[50px] w-[50px] min-w-[50px] items-center justify-center overflow-hidden rounded-2xl bg-zinc-100">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="block h-auto max-h-[42px] w-auto max-w-[42px] object-contain"
                />
              ) : (
                <span className="text-sm font-black text-zinc-400">
                  {settings.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: settings.primaryColor }}
              >
                {settings.businessName} {settings.kioskSubtitle}
              </p>

              <h1 className="truncate text-[23px] font-black leading-none tracking-tight">
                {selectedProduct
                  ? "Personaliza tu producto"
                  : step === "summary"
                  ? "Resumen de compra"
                  : step === "customer"
                  ? "Datos del pedido"
                  : step === "payment"
                  ? "Medio de pago"
                  : settings.kioskTitle}
              </h1>
            </div>
          </div>

          <button className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-center shadow-sm">
            <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-50 text-[11px] font-black">
              QR
            </div>
            <p className="mt-1 text-[8px] font-black uppercase text-zinc-500">
              Identifícate
            </p>
          </button>
        </div>
      </header>

      {orderMessage && (
        <div className="mx-3 mt-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-black text-green-700">
          {orderMessage}
        </div>
      )}

      {selectedProduct ? (
        <section className="p-3 pb-32">
          <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={closeProductBuilder}
                  className="mb-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black"
                >
                 Volver
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
                          {max > 0 ? `/${max}` : ""} {"\u00B7"} Mínimo: {min}
{group.required ? " · Obligatorio" : " · Opcional"}
                        </p>
                      </div>

                      {!valid && (
                        <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-yellow-800">
                          Falta seleccionar
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {group.template.options.map((option) => {
                        const selected = selectedIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleOption(group, option.id)}
                            className="relative rounded-2xl border bg-white p-3 text-center transition"
                            style={{
                              minHeight: "150px",
                              borderColor: selected
                                ? settings.primaryColor
                                : "#e4e4e7",
                              boxShadow: selected
                                ? `0 0 0 2px ${settings.primaryColor}22`
                                : "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <div className="flex h-full flex-col items-center justify-start gap-2">
                              <div className="flex h-[72px] w-[86px] items-center justify-center overflow-hidden bg-transparent">
                                {option.imageUrl ? (
                                  <img
                                    src={option.imageUrl}
                                    alt={option.name}
                                    className="block h-auto max-h-[72px] w-auto max-w-[86px] object-contain"
                                  />
                                ) : (
                                  <span className="text-2xl font-black text-zinc-400">
                                    +
                                  </span>
                                )}
                              </div>

                              <p className="w-full break-words text-sm font-black leading-[17px] text-zinc-950">
                                {option.name}
                              </p>

                              {option.price > 0 && (
                                <p
                                  className="text-xs font-black"
                                  style={{ color: settings.primaryColor }}
                                >
                                  + {formatPrice(option.price)}
                                </p>
                              )}
                            </div>

                            <div
                              className="absolute right-3 top-3 flex h-[26px] w-[26px] items-center justify-center rounded-full text-sm font-black text-white"
                              style={{
                                border: selected
                                  ? "none"
                                  : "2px solid #d4d4d8",
                                background: selected
                                  ? settings.primaryColor
                                  : "#ffffff",
                              }}
                            >
                              {selected ? "\u2713" : ""}
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
        <section className="p-3 pb-32">
          <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
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

            {settings.tipsEnabled && (
              <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                      Propina
                    </p>

                    <div className="mt-1 flex items-center gap-3">
  <h3 className="text-2xl font-black">
    ¿Desea agregar propina?
  </h3>

  <span className="text-4xl leading-none" aria-hidden="true">
  {"\u{1F60D}"}
</span>
</div>

                    <p className="mt-1 text-sm font-bold text-zinc-500">
                      {tipPercent}% sugerido: {formatPrice(Math.round(cartTotal * (tipPercent / 100)))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTipSelected((current) => !current)}
                    className="rounded-2xl px-6 py-4 text-base font-black text-white shadow-sm"
                    style={{
                      background: tipSelected ? settings.primaryColor : "#18181b",
                    }}
                  >
                    {tipSelected ? "Propina agregada" : `Agregar ${tipPercent}%`}
                  </button>
                </div>

                {tipSelected && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4">
                    <p className="font-black text-zinc-500">
                      Propina {tipPercent}%
                    </p>

                    <p className="text-2xl font-black text-[#10B557]">
                      {formatPrice(tipAmount)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-5">
              <p className="text-2xl font-black">Total</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(finalTotal)}
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
        <section className="p-3 pb-32">
          <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                  Hola, {loggedCustomerName} ðŸ‘‹
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
                {formatPrice(finalTotal)}
              </p>
            </div>

            <button
              onClick={goToPaymentStep}
              disabled={
                cart.length === 0 ||
                (!loggedCustomerName && !customerName.trim())
              }
              className="mt-5 w-full rounded-2xl py-5 text-xl font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
              style={{
                background:
                  cart.length > 0 && (loggedCustomerName || customerName.trim())
                    ? settings.primaryColor
                    : undefined,
              }}
            >
              Continuar al pago
            </button>

            <button
              onClick={clearCart}
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-4 text-sm font-black"
            >
              Cancelar pedido
            </button>
          </div>
        </section>
      ) : step === "payment" ? (
        <section className="p-3 pb-32">
          <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black">Elige medio de pago</h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Selecciona cómo pagará el cliente.
                </p>
              </div>

              <button
                onClick={() => setStep("customer")}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black"
              >
                Volver
              </button>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
                Cliente
              </p>

              <p className="mt-1 text-2xl font-black">
                {loggedCustomerName || customerName}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("debit_credit")}
                className="rounded-3xl border p-6 text-left transition"
                style={{
                  borderColor:
                    selectedPaymentMethod === "debit_credit"
                      ? settings.primaryColor
                      : "#e4e4e7",
                  background:
                    selectedPaymentMethod === "debit_credit"
                      ? `${settings.primaryColor}12`
                      : "#ffffff",
                  boxShadow:
                    selectedPaymentMethod === "debit_credit"
                      ? `0 0 0 2px ${settings.primaryColor}22`
                      : "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white"
                      style={{ background: settings.primaryColor }}
                    >
                      {"\u{1F4B3}"}
                    </div>

                    <h3 className="text-2xl font-black">Débito / Crédito</h3>

                    <p className="mt-2 text-sm font-bold text-zinc-500">
                      Pago con tarjeta bancaria en terminal.
                    </p>
                  </div>

                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
                    style={{
                      background:
                        selectedPaymentMethod === "debit_credit"
                          ? settings.primaryColor
                          : "#ffffff",
                      border:
                        selectedPaymentMethod === "debit_credit"
                          ? "none"
                          : "2px solid #d4d4d8",
                      color: "#ffffff",
                    }}
                  >
                    {selectedPaymentMethod === "debit_credit" ? "âœ“" : ""}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("food_benefit")}
                className="rounded-3xl border p-6 text-left transition"
                style={{
                  borderColor:
                    selectedPaymentMethod === "food_benefit"
                      ? settings.primaryColor
                      : "#e4e4e7",
                  background:
                    selectedPaymentMethod === "food_benefit"
                      ? `${settings.primaryColor}12`
                      : "#ffffff",
                  boxShadow:
                    selectedPaymentMethod === "food_benefit"
                      ? `0 0 0 2px ${settings.primaryColor}22`
                      : "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white"
                      style={{ background: settings.primaryColor }}
                    >
                      {"\u{1F37D}\uFE0F"}
                    </div>

                    <h3 className="text-2xl font-black">
                      Beneficio alimentación
                    </h3>

                    <p className="mt-2 text-sm font-bold text-zinc-500">
                      Edenred, Pluxee
                    </p>
                  </div>

                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
                    style={{
                      background:
                        selectedPaymentMethod === "food_benefit"
                          ? settings.primaryColor
                          : "#ffffff",
                      border:
                        selectedPaymentMethod === "food_benefit"
                          ? "none"
                          : "2px solid #d4d4d8",
                      color: "#ffffff",
                    }}
                  >
                    {selectedPaymentMethod === "food_benefit" ? "âœ“" : ""}
                  </div>
                </div>
              </button>
            </div>

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
                {formatPrice(finalTotal)}
              </p>
            </div>

            <button
              onClick={confirmOrder}
              disabled={!selectedPaymentMethod || confirmingOrder}
              className="mt-5 w-full rounded-2xl py-5 text-xl font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
              style={{
                background:
                  selectedPaymentMethod && !confirmingOrder
                    ? settings.primaryColor
                    : undefined,
              }}
            >
              {confirmingOrder
                ? "Confirmando pago..."
                : "Confirmar pago y enviar a cocina"}
            </button>

            <p className="mt-3 text-center text-xs font-bold text-zinc-400">
              Modo prueba: este botón simula pago aprobado. Más adelante se
              conectará con el terminal de pago.
            </p>

            <button
              onClick={clearCart}
              className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white py-4 text-sm font-black"
            >
              Cancelar pedido
            </button>
          </div>
        </section>
      ) : (
        <section className="grid min-h-[calc(100vh-71px)] grid-cols-[118px_minmax(0,1fr)] overflow-x-hidden">
          <aside className="sticky top-[71px] h-[calc(100vh-71px)] overflow-y-auto border-r border-zinc-100 bg-zinc-50 px-2 py-3">
            <h2 className="mb-3 px-1 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
              Categorías
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className="w-full rounded-2xl px-3 py-4 text-left text-[12px] font-black uppercase leading-tight"
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
                  className="w-full rounded-2xl px-3 py-4 text-left text-[12px] font-black uppercase leading-tight"
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

          <section className="min-w-0 overflow-x-hidden bg-white p-3 pb-36">
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
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const hasModifiers =
                    getActiveModifierGroups(product).length > 0;

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition active:scale-[0.99]"
                    >
                      <button
                        onClick={() => openProduct(product)}
                        className="flex h-[315px] w-full flex-col text-left"
                      >
                        <div className="flex h-[125px] min-h-[125px] w-full items-center justify-center overflow-hidden bg-white">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="block h-full w-full object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400">
  <div className="text-3xl" aria-hidden="true">
    {"\u{1F6D2}"}
  </div>

  <p className="mt-1 text-[10px] font-black uppercase">
    Sin foto
  </p>
</div>
                          )}
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col p-3">
                          <h2 className="min-h-[44px] text-[17px] font-black leading-[20px]">
                            {product.name}
                          </h2>

                          {product.description ? (
                            <p className="mt-1 line-clamp-2 min-h-[36px] text-[12px] leading-[17px] text-zinc-500">
                              {product.description}
                            </p>
                          ) : (
                            <div className="mt-1 min-h-[36px]" />
                          )}

                          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                            <div className="min-w-0">
                              <p
                                className="whitespace-nowrap text-[24px] font-black leading-none"
                                style={{ color: settings.primaryColor }}
                              >
                                {formatPrice(product.price)}
                              </p>

                              {hasModifiers && (
                                <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-zinc-400">
                                  Personalizable
                                </p>
                              )}
                            </div>

                            <div
                              className="flex h-11 w-11 min-w-11 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-sm"
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

          <footer className="fixed inset-x-0 bottom-0 z-[9999] border-t border-zinc-200 bg-white/95 px-3 py-3 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] backdrop-blur">
            <div className="mx-auto flex max-w-[760px] items-stretch overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-2xl">
              <div className="flex min-w-[155px] flex-col justify-center px-5 py-3">
                <p className="m-0 text-[12px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Total
                </p>

                <p
                  className="m-0 mt-1 text-[27px] font-black leading-none"
                  style={{ color: settings.primaryColor }}
                >
                  {formatPrice(finalTotal)}
                </p>

                {cartQuantity > 0 && (
                  <p className="m-0 mt-1 text-[12px] font-black text-zinc-500">
                    {cartQuantity} producto{cartQuantity > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <button
                onClick={goToSummary}
                disabled={cart.length === 0}
                className="flex flex-1 items-center justify-center px-5 text-[22px] font-black disabled:cursor-not-allowed"
                style={{
                  border: "none",
                  background: cart.length > 0 ? settings.primaryColor : "#e4e4e7",
                  color: cart.length > 0 ? "white" : "#71717a",
                }}
              >
                Siguiente &gt;
              </button>
            </div>
          </footer>
        </section>
      )}
    </main>
  );
}


