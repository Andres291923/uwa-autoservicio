"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  order?: number;
  active?: boolean;
  channelVisibility?: string;
};

type ModifierOption = {
  id: number;
  name: string;
  price: number;
  active?: boolean;
  channelVisibility?: string;
  order?: number;
};

type ModifierTemplate = {
  id: number;
  name: string;
  order?: number;
  active?: boolean;
  channelVisibility?: string;
  options: ModifierOption[];
};

type ProductModifierGroup = {
  id: number;
  min: number;
  max: number;
  required: boolean;
  order?: number;
  active?: boolean;
  channelVisibility?: string;
  template: ModifierTemplate;
};

type Product = {
  id: number;
  name: string;
  price: number;
  order?: number;
  active?: boolean;
  channelVisibility?: string;
  category?: Category | null;
  modifierGroups: ProductModifierGroup[];
};

type CartItem = {
  localId: string;
  product: Product;
  quantity: number;
  modifierOptionIds: number[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isVisibleByChannel(value: unknown) {
  const channel = String(value || "all").toLowerCase().trim();

  return (
    !channel ||
    channel === "all" ||
    channel.includes("manual") ||
    channel.includes("comanda") ||
    channel.includes("totem") ||
    channel.includes("online") ||
    channel.includes("company")
  );
}

function isProductAvailable(product: Product) {
  return (
    product.active !== false &&
    product.category?.active !== false &&
    isVisibleByChannel(product.channelVisibility) &&
    isVisibleByChannel(product.category?.channelVisibility)
  );
}

function getAvailableGroups(product: Product) {
  return [...(product.modifierGroups || [])]
    .filter((group) => {
      return (
        group.active !== false &&
        isVisibleByChannel(group.channelVisibility) &&
        group.template?.active !== false &&
        isVisibleByChannel(group.template?.channelVisibility)
      );
    })
    .sort((a, b) => {
      return (
        Number(a.order || 0) - Number(b.order || 0) ||
        String(a.template?.name || "").localeCompare(
          String(b.template?.name || ""),
          "es"
        )
      );
    })
    .map((group) => ({
      ...group,
      template: {
        ...group.template,
        options: [...(group.template?.options || [])]
          .filter((option) => {
            return (
              option.active !== false &&
              isVisibleByChannel(option.channelVisibility)
            );
          })
          .sort((a, b) => {
            return (
              Number(a.order || 0) - Number(b.order || 0) ||
              a.name.localeCompare(b.name, "es")
            );
          }),
      },
    }))
    .filter((group) => group.template.options.length > 0);
}

function getOptionsByIds(product: Product, ids: number[]) {
  const idSet = new Set(ids);

  return getAvailableGroups(product)
    .flatMap((group) => group.template.options)
    .filter((option) => idSet.has(option.id));
}

function getCartItemUnitTotal(item: CartItem) {
  const extras = getOptionsByIds(item.product, item.modifierOptionIds).reduce(
    (sum, option) => sum + Number(option.price || 0),
    0
  );

  return Number(item.product.price || 0) + extras;
}

export default function ComandaPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [clave, setClave] = useState("");
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [editCartItemId, setEditCartItemId] = useState<string | null>(null);
  const [selectedByProduct, setSelectedByProduct] = useState<
    Record<number, Record<number, number[]>>
  >({});
  const [quantityByProduct, setQuantityByProduct] = useState<
    Record<number, number>
  >({});

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerComment, setCustomerComment] = useState("");
  const [sending, setSending] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);

  async function checkSession() {
    try {
      const response = await fetch("/api/comanda/session", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      setUnlocked(Boolean(data.ok));
    } catch (error) {
      console.error(error);
      setUnlocked(false);
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadProducts() {
    try {
      setLoadingProducts(true);

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar productos.");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loginComanda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoginError("");

      const response = await fetch("/api/comanda/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clave,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoginError(data.error || "Clave incorrecta.");
        return;
      }

      setUnlocked(true);
      setClave("");
    } catch (error) {
      console.error(error);
      setLoginError("No se pudo iniciar comanda.");
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

    useEffect(() => {
    if (!unlocked) return;

    loadProducts();

    const interval = window.setInterval(() => {
      loadProducts();
    }, 5000);

    const handleFocus = () => {
      loadProducts();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProducts();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [unlocked]);

  const availableProducts = useMemo(() => {
    const cleanSearch = normalizeText(search);

    return products
      .filter(isProductAvailable)
      .filter((product) => {
        if (!cleanSearch) return true;

        return (
          normalizeText(product.name).includes(cleanSearch) ||
          normalizeText(product.category?.name).includes(cleanSearch)
        );
      })
      .sort((a, b) => {
        return (
          Number(a.category?.order || 0) - Number(b.category?.order || 0) ||
          Number(a.order || 0) - Number(b.order || 0) ||
          a.name.localeCompare(b.name, "es")
        );
      });
  }, [products, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + getCartItemUnitTotal(item) * item.quantity;
    }, 0);
  }, [cart]);

  function getDraftQuantity(productId: number) {
    return Math.max(1, Number(quantityByProduct[productId] || 1));
  }

  function setDraftQuantity(productId: number, direction: 1 | -1) {
    setQuantityByProduct((current) => ({
      ...current,
      [productId]: Math.max(1, getDraftQuantity(productId) + direction),
    }));
  }

  function toggleProduct(productId: number) {
    setEditCartItemId(null);
    setOpenProductId((current) => (current === productId ? null : productId));
  }

  function toggleOption(
    productId: number,
    group: ProductModifierGroup,
    optionId: number
  ) {
    setSelectedByProduct((current) => {
      const productSelection = current[productId] || {};
      const groupSelection = productSelection[group.id] || [];
      const alreadySelected = groupSelection.includes(optionId);
      const max = Number(group.max || 0);

      let nextGroupSelection = groupSelection;

      if (alreadySelected) {
        nextGroupSelection = groupSelection.filter((id) => id !== optionId);
      } else if (max === 1) {
        nextGroupSelection = [optionId];
      } else if (max > 1 && groupSelection.length >= max) {
        alert(`Puedes seleccionar maximo ${max} opciones en ${group.template.name}.`);
        return current;
      } else {
        nextGroupSelection = [...groupSelection, optionId];
      }

      return {
        ...current,
        [productId]: {
          ...productSelection,
          [group.id]: nextGroupSelection,
        },
      };
    });
  }

  function validateProduct(product: Product) {
    const groups = getAvailableGroups(product);
    const productSelection = selectedByProduct[product.id] || {};

    for (const group of groups) {
      const selected = productSelection[group.id] || [];
      const minRequired = Math.max(
        Number(group.min || 0),
        group.required ? 1 : 0
      );
      const max = Number(group.max || 0);

      if (selected.length < minRequired) {
        alert(`Falta seleccionar ${minRequired} opcion(es) en ${group.template.name}.`);
        return false;
      }

      if (max > 0 && selected.length > max) {
        alert(`Seleccionaste demasiadas opciones en ${group.template.name}.`);
        return false;
      }
    }

    return true;
  }

  function addProductToCart(product: Product) {
    if (!validateProduct(product)) return;

    const productSelection = selectedByProduct[product.id] || {};
    const modifierOptionIds = Object.values(productSelection)
      .flat()
      .map(Number)
      .filter(Boolean);

    const quantity = getDraftQuantity(product.id);

    setCart((current) => {
      if (editCartItemId) {
        return current.map((item) =>
          item.localId === editCartItemId
            ? {
                ...item,
                product,
                quantity,
                modifierOptionIds,
              }
            : item
        );
      }

      return [
        ...current,
        {
          localId: `${Date.now()}-${Math.random()}`,
          product,
          quantity,
          modifierOptionIds,
        },
      ];
    });

    setSelectedByProduct((current) => ({
      ...current,
      [product.id]: {},
    }));

    setQuantityByProduct((current) => ({
      ...current,
      [product.id]: 1,
    }));

    setEditCartItemId(null);
    setOpenProductId(null);
  }

  function startEditCartItem(item: CartItem) {
    const groups = getAvailableGroups(item.product);
    const selectedIds = new Set(item.modifierOptionIds);
    const nextSelection: Record<number, number[]> = {};

    groups.forEach((group) => {
      const ids = group.template.options
        .filter((option) => selectedIds.has(option.id))
        .map((option) => option.id);

      if (ids.length > 0) {
        nextSelection[group.id] = ids;
      }
    });

    setSelectedByProduct((current) => ({
      ...current,
      [item.product.id]: nextSelection,
    }));

    setQuantityByProduct((current) => ({
      ...current,
      [item.product.id]: item.quantity,
    }));

    setEditCartItemId(item.localId);
    setOpenProductId(item.product.id);

    window.setTimeout(() => {
      document
        .getElementById(`product-${item.product.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function changeCartQuantity(localId: string, direction: 1 | -1) {
    setCart((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + direction),
            }
          : item
      )
    );
  }

  function removeCartItem(localId: string) {
    setCart((current) => current.filter((item) => item.localId !== localId));
  }

  async function sendComanda() {
    const cleanCustomerName = customerName.trim();

    if (!cleanCustomerName) {
      alert("Ingresa el nombre del cliente arriba.");
      return;
    }

    if (cart.length === 0) {
      alert("Agrega productos a la comanda.");
      return;
    }

    const ok = window.confirm(
      "Confirma que el pago manual ya fue aprobado. Al enviar, la comanda llega a cocina y al agente de impresion."
    );

    if (!ok) return;

    try {
      setSending(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: cleanCustomerName,
          customerComment:
            customerComment.trim() ||
            "COMANDA MANUAL - Pago validado manualmente",
          paymentMethod: "manual_paid",
          orderSource: "manual",
          fulfillmentType: "immediate",
          totemCode: "comanda-manual",
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            modifierOptionIds: item.modifierOptionIds,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.error || "No se pudo enviar la comanda.");
        return;
      }

      setLastOrderNumber(data.orderNumber || null);
      setCustomerName("");
      setCustomerComment("");
      setSearch("");
      setOpenProductId(null);
      setSelectedByProduct({});
      setQuantityByProduct({});
      setCart([]);

      alert(
        `Comanda #${String(data.orderNumber || "").padStart(
          3,
          "0"
        )} enviada a cocina.`
      );
    } catch (error) {
      console.error(error);
      alert("Error al enviar comanda.");
    } finally {
      setSending(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
        <div className="rounded-3xl bg-white/10 p-8 text-center">
          <p className="text-xl font-black">Cargando comanda...</p>
        </div>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5 text-white">
        <form
          onSubmit={loginComanda}
          className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-7 text-zinc-950 shadow-2xl"
        >
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            Modo emergencia
          </p>

          <h1 className="mt-3 text-4xl font-black">Comanda manual</h1>

          <p className="mt-3 text-sm font-bold text-zinc-500">
            Ingresa la clave para tomar pedidos manuales.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-black uppercase text-zinc-500">
              Clave
            </span>

            <input
              type="password"
              inputMode="numeric"
              value={clave}
              onChange={(event) => setClave(event.target.value)}
              className="w-full rounded-2xl border-2 border-zinc-200 px-5 py-4 text-2xl font-black outline-none focus:border-[#10B557]"
              placeholder="****"
              autoFocus
            />
          </label>

          {loginError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-[#10B557] px-6 py-5 text-lg font-black text-white shadow-lg"
          >
            Entrar
          </button>

          <a
            href="/login?next=/comanda"
            className="mt-4 block text-center text-sm font-black text-zinc-500 underline"
          >
            Entrar como administrador
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                Modo emergencia
              </p>
              <h1 className="text-2xl font-black">Comanda manual</h1>
            </div>

            <a
              href="/cocina"
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
            >
              Cocina
            </a>
          </div>

          {lastOrderNumber && (
            <div className="mt-3 rounded-2xl bg-green-100 px-4 py-3 text-sm font-black text-green-800">
              Ultima comanda enviada: #{String(lastOrderNumber).padStart(3, "0")}
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <label>
            <span className="mb-2 block text-sm font-black uppercase text-zinc-500">
              Nombre cliente
            </span>

            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Ej: Andres"
              className="w-full rounded-2xl border-2 border-zinc-200 px-5 py-4 text-2xl font-black outline-none focus:border-[#10B557]"
            />
          </label>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <label>
            <span className="mb-2 block text-sm font-black uppercase text-zinc-500">
              Buscar producto
            </span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bowl M pollo, carne, bebida..."
              className="w-full rounded-2xl border-2 border-zinc-200 px-5 py-4 text-lg font-black outline-none focus:border-[#10B557]"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="bg-zinc-950 px-5 py-4 text-white">
            <h2 className="text-xl font-black">Productos disponibles</h2>
            <p className="text-sm font-bold text-zinc-300">
              Toca un producto para abrir sus modificadores.
            </p>
          </div>

          {loadingProducts ? (
            <div className="p-8 text-center">
              <p className="text-lg font-black">Cargando productos...</p>
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-black">No hay productos disponibles.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {availableProducts.map((product) => {
                const isOpen = openProductId === product.id;
                const groups = getAvailableGroups(product);
                const productSelection = selectedByProduct[product.id] || {};
                const quantity = getDraftQuantity(product.id);

                return (
                  <article key={product.id} id={`product-${product.id}`} className="bg-white">
                    <button
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left ${
                        isOpen ? "bg-green-50" : "bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black uppercase text-zinc-400">
                          {product.category?.name || "Producto"}
                        </p>

                        <h3 className="mt-1 text-xl font-black leading-tight">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-lg font-black text-[#10B557]">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black ${
                          isOpen
                            ? "bg-[#10B557] text-transparent"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {isOpen ? "-" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-green-100 bg-green-50 px-5 pb-5">
                        {editCartItemId && (
                          <div className="mt-4 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 text-sm font-black text-orange-800">
                            Estas editando un producto del resumen. Cambia las opciones y presiona Guardar cambios.
                          </div>
                        )}

                        {groups.length === 0 ? (
                          <div className="mt-4 rounded-2xl bg-white p-4">
                            <p className="font-black text-zinc-600">
                              Sin modificadores activos.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-5 pt-5">
                            {groups.map((group) => {
                              const selected = productSelection[group.id] || [];
                              const minRequired = Math.max(
                                Number(group.min || 0),
                                group.required ? 1 : 0
                              );

                              return (
                                <section key={group.id}>
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <h4 className="text-lg font-black">
                                      {group.template.name}
                                    </h4>

                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">
                                      Min {minRequired} / Max{" "}
                                      {group.max || "sin limite"}
                                    </span>
                                  </div>

                                  <div className="ml-3 space-y-2 border-l-4 border-[#10B557] pl-3">
                                    {group.template.options.map((option) => {
                                      const active = selected.includes(option.id);

                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          onClick={() =>
                                            toggleOption(
                                              product.id,
                                              group,
                                              option.id
                                            )
                                          }
                                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left ${
                                            active
                                              ? "border-[#10B557] bg-white"
                                              : "border-zinc-200 bg-white"
                                          }`}
                                        >
                                          <div>
                                            <p className="font-black">
                                              {option.name}
                                            </p>

                                            {Number(option.price || 0) > 0 && (
                                              <p className="text-sm font-black text-[#10B557]">
                                                + {formatPrice(option.price)}
                                              </p>
                                            )}
                                          </div>

                                          <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[0px] leading-none overflow-hidden ${
                                              active
                                                ? "border-[#10B557] bg-[#10B557] text-transparent"
                                                : "border-zinc-300 bg-white text-transparent"
                                            }`}
                                          >
                                            ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-6 rounded-3xl bg-white p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-black uppercase text-zinc-400">
                                Cantidad
                              </p>

                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDraftQuantity(product.id, -1)}
                                  className="h-11 w-11 rounded-full bg-zinc-100 text-2xl font-black"
                                >
                                  -
                                </button>

                                <span className="min-w-10 text-center text-2xl font-black">
                                  {quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setDraftQuantity(product.id, 1)}
                                  className="h-11 w-11 rounded-full bg-zinc-100 text-2xl font-black"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => addProductToCart(product)}
                              className="rounded-3xl bg-zinc-950 px-5 py-4 text-base font-black text-white"
                            >
                              {editCartItemId ? "Guardar cambios" : "Agregar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                Final
              </p>
              <h2 className="text-2xl font-black">Resumen y comentarios</h2>
            </div>

            <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-black">
              {cart.length} item(s)
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="rounded-3xl bg-zinc-50 p-6 text-center">
              <p className="font-black text-zinc-500">
                Todavia no hay productos agregados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                const options = getOptionsByIds(
                  item.product,
                  item.modifierOptionIds
                );

                return (
                  <div
                    key={item.localId}
                    className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">
                          {item.quantity}x {item.product.name}
                        </h3>

                        {options.length > 0 && (
                          <p className="mt-1 text-sm font-bold text-zinc-600">
                            {options.map((option) => option.name).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEditCartItem(item)}
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCartItem(item.localId)}
                          className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeCartQuantity(item.localId, -1)}
                          className="h-10 w-10 rounded-full bg-white text-xl font-black shadow-sm"
                        >
                          -
                        </button>

                        <span className="min-w-8 text-center text-lg font-black">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => changeCartQuantity(item.localId, 1)}
                          className="h-10 w-10 rounded-full bg-white text-xl font-black shadow-sm"
                        >
                          +
                        </button>
                      </div>

                      <p className="text-lg font-black text-[#10B557]">
                        {formatPrice(getCartItemUnitTotal(item) * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-black uppercase text-zinc-500">
              Comentarios al final
            </span>

            <textarea
              value={customerComment}
              onChange={(event) => setCustomerComment(event.target.value)}
              rows={4}
              placeholder="Ej: sin cebolla, sin sal, cliente apurado..."
              className="w-full resize-none rounded-2xl border-2 border-zinc-200 px-5 py-4 text-base font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <div className="mt-5 border-t border-zinc-200 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-black">Total</span>
              <span className="text-3xl font-black text-[#10B557]">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={sendComanda}
              disabled={sending || cart.length === 0}
              className="w-full rounded-3xl bg-[#10B557] px-6 py-5 text-lg font-black text-white shadow-lg disabled:bg-zinc-300"
            >
              {sending ? "Enviando..." : "Enviar comanda e imprimir"}
            </button>

            <p className="mt-3 text-center text-xs font-bold text-zinc-500">
              Usar solo despues de aprobar pago manual.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}