"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  active: boolean;
};

type ModifierOption = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  active: boolean;
  order: number;
};

type ModifierTemplate = {
  id: number;
  name: string;
  options: ModifierOption[];
};

type ProductModifierGroup = {
  id: number;
  min: number;
  max: number;
  required: boolean;
  active: boolean;
  order: number;
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
  modifierGroups?: ProductModifierGroup[];
};

type Settings = {
  businessName: string;
  kioskTitle: string;
  kioskSubtitle: string;
  logoUrl: string | null;
  primaryColor: string;
};

type CartItem = {
  id: string;
  productId: number;
  productName: string;
  total: number;
  modifierOptionIds: number[];
  modifiersText: string[];
  customerComment: string;
};

type LoggedCustomer = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  walletBalance: number;
};

type OpeningHour = {
  dayOfWeek: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
};

const defaultSettings: Settings = {
  businessName: "Mi negocio",
  kioskTitle: "Pedido online",
  kioskSubtitle: "Compra online y retira en local",
  logoUrl: null,
  primaryColor: "#10B557",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function createCartId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayInputDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function minutesToTime(total: number) {
  const hour = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const minute = (total % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function buildTimeSlots(openTime: string, closeTime: string, step = 30) {
  const slots: string[] = [];
  const start = timeToMinutes(openTime);
  const end = timeToMinutes(closeTime);

  for (let current = start; current < end; current += step) {
    slots.push(minutesToTime(current));
  }

  return slots;
}

function getScheduleForDate(dateValue: string, openingHours: OpeningHour[]) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T12:00:00`);
  const dayOfWeek = date.getDay();

  return (
    openingHours.find(
      (item) => item.dayOfWeek === dayOfWeek && item.enabled
    ) || null
  );
}

function buildScheduleBanner(openingHours: OpeningHour[]) {
  const monFri = openingHours.filter(
    (item) => item.enabled && item.dayOfWeek >= 1 && item.dayOfWeek <= 5
  );

  const saturday = openingHours.find(
    (item) => item.enabled && item.dayOfWeek === 6
  );

  const sunday = openingHours.find(
    (item) => item.enabled && item.dayOfWeek === 0
  );

  const parts: string[] = [];

  if (
    monFri.length === 5 &&
    monFri.every(
      (item) =>
        item.openTime === monFri[0].openTime &&
        item.closeTime === monFri[0].closeTime
    )
  ) {
    parts.push(
      `Lunes a Viernes ${monFri[0].openTime} a ${monFri[0].closeTime}`
    );
  } else {
    monFri.forEach((item) => {
      const dayName =
        item.dayOfWeek === 1
          ? "Lunes"
          : item.dayOfWeek === 2
          ? "Martes"
          : item.dayOfWeek === 3
          ? "Miércoles"
          : item.dayOfWeek === 4
          ? "Jueves"
          : "Viernes";

      parts.push(`${dayName} ${item.openTime} a ${item.closeTime}`);
    });
  }

  if (saturday) {
    parts.push(`Sábado ${saturday.openTime} a ${saturday.closeTime}`);
  }

  if (sunday) {
    parts.push(`Domingo ${sunday.openTime} a ${sunday.closeTime}`);
  }

  return parts.join(" · ");
}

export default function PedidoPage() {
  const todayInputDate = useMemo(() => getTodayInputDate(), []);

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [products, setProducts] = useState<Product[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
    "all"
  );

  const [scheduledDate, setScheduledDate] = useState(todayInputDate);
  const [scheduledTime, setScheduledTime] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<
    Record<number, number[]>
  >({});
  const [selectedProductComment, setSelectedProductComment] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [loggedCustomer, setLoggedCustomer] = useState<LoggedCustomer | null>(
    null
  );
  const [authMode, setAuthMode] = useState<"login" | "register" | "guest">(
    "login"
  );
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  const [fulfillmentType, setFulfillmentType] = useState<
    "immediate" | "scheduled"
  >("immediate");

  const [paymentMethod, setPaymentMethod] = useState<
    "debit_credit" | "food_benefit"
  >("debit_credit");

  const [message, setMessage] = useState("");
  const [closedStoreModalVisible, setClosedStoreModalVisible] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  async function loadInitialData() {
    try {
      const [settingsResponse, productsResponse, hoursResponse] =
        await Promise.all([
          fetch("/api/settings"),
          fetch("/api/products"),
          fetch("/api/settings/hours"),
        ]);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings({ ...defaultSettings, ...settingsData });
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(Array.isArray(productsData) ? productsData : []);
      }

      if (hoursResponse.ok) {
        const hoursData = await hoursResponse.json();
        setOpeningHours(Array.isArray(hoursData.hours) ? hoursData.hours : []);
      }
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar el catalogo.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const scheduleBanner = useMemo(() => {
    return buildScheduleBanner(openingHours);
  }, [openingHours]);

  const selectedDaySchedule = useMemo(() => {
    return getScheduleForDate(scheduledDate, openingHours);
  }, [scheduledDate, openingHours]);

  useEffect(() => {
    if (fulfillmentType !== "scheduled") return;

    if (!selectedDaySchedule) {
      setAvailableTimeSlots([]);
      setScheduledTime("");
      return;
    }

    const slots = buildTimeSlots(
      selectedDaySchedule.openTime,
      selectedDaySchedule.closeTime,
      30
    );

    setAvailableTimeSlots(slots);

    if (!slots.includes(scheduledTime)) {
      setScheduledTime(slots[0] || "");
    }
  }, [fulfillmentType, selectedDaySchedule, scheduledTime]);

  const activeProducts = useMemo(() => {
    return products
      .filter((product) => product.active !== false)
      .filter((product) => product.category?.active !== false)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [products]);

  const categories = useMemo(() => {
    const map = new Map<number, Category>();

    for (const product of activeProducts) {
      if (product.category) {
        map.set(product.category.id, product.category);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [activeProducts]);

  const visibleProducts = useMemo(() => {
    if (selectedCategoryId === "all") return activeProducts;
    return activeProducts.filter(
      (product) => product.category?.id === selectedCategoryId
    );
  }, [activeProducts, selectedCategoryId]);

  const activeModifierGroups = useMemo(() => {
    if (!selectedProduct) return [];

    return (selectedProduct.modifierGroups || [])
      .filter((group) => group.active !== false)
      .filter((group) => group.template)
      .map((group) => ({
        ...group,
        template: {
          ...group.template,
          options: (group.template.options || [])
            .filter((option) => option.active !== false)
            .sort((a, b) => a.order - b.order || a.id - b.id),
        },
      }))
      .filter((group) => group.template.options.length > 0)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [selectedProduct]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const walletAmountToUse = useMemo(() => {
    if (!loggedCustomer || !useWallet) return 0;
    return Math.min(loggedCustomer.walletBalance, cartTotal);
  }, [loggedCustomer, useWallet, cartTotal]);

  const totalToPay = Math.max(0, cartTotal - walletAmountToUse);

  function switchToScheduled() {
    setFulfillmentType("scheduled");

    if (!scheduledDate) {
      setScheduledDate(todayInputDate);
    }
  }

  function openProduct(product: Product) {
    const groups = (product.modifierGroups || []).filter(
      (group) => group.active !== false
    );

    if (groups.length === 0) {
      addSimpleProduct(product);
      return;
    }

    setSelectedProduct(product);
    setSelectedOptionsByGroup({});
    setSelectedProductComment("");
    setMessage("");
  }

  function addSimpleProduct(product: Product) {
    setCart((current) => [
      ...current,
      {
        id: createCartId(),
        productId: product.id,
        productName: product.name,
        total: product.price,
        modifierOptionIds: [],
        modifiersText: [],
        customerComment: "",
      },
    ]);
  }

  function toggleOption(group: ProductModifierGroup, optionId: number) {
    setSelectedOptionsByGroup((current) => {
      const selected = current[group.id] || [];
      const exists = selected.includes(optionId);

      if (exists) {
        return {
          ...current,
          [group.id]: selected.filter((id) => id !== optionId),
        };
      }

      if (group.max > 0 && selected.length >= group.max) {
        return {
          ...current,
          [group.id]: [...selected.slice(1), optionId],
        };
      }

      return {
        ...current,
        [group.id]: [...selected, optionId],
      };
    });
  }

  function canAddSelectedProduct() {
    for (const group of activeModifierGroups) {
      const selected = selectedOptionsByGroup[group.id] || [];

      if (group.required && selected.length < group.min) return false;
      if (group.max > 0 && selected.length > group.max) return false;
    }

    return true;
  }

  function addConfiguredProduct() {
    if (!selectedProduct) return;

    if (!canAddSelectedProduct()) {
      setMessage("Completa las opciones obligatorias.");
      return;
    }

    const modifierOptionIds: number[] = [];
    const modifiersText: string[] = [];
    let modifiersTotal = 0;

    for (const group of activeModifierGroups) {
      const selectedIds = selectedOptionsByGroup[group.id] || [];

      for (const optionId of selectedIds) {
        const option = group.template.options.find(
          (item) => item.id === optionId
        );

        if (option) {
          modifierOptionIds.push(option.id);
          modifiersText.push(`${group.template.name}: ${option.name}`);
          modifiersTotal += option.price;
        }
      }
    }

    const total = selectedProduct.price + modifiersTotal;

    setCart((current) => [
      ...current,
      {
        id: createCartId(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        total,
        modifierOptionIds,
        modifiersText,
        customerComment: selectedProductComment.trim(),
      },
    ]);

    setSelectedProduct(null);
    setSelectedOptionsByGroup({});
    setSelectedProductComment("");
    setMessage("");
  }

  function removeCartItem(id: string) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  async function refreshCustomerWallet(customerId: number) {
    try {
      const response = await fetch("/api/customer-auth/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) return;

      setLoggedCustomer({
        id: data.id,
        name: data.name,
        email: data.email,
        active: data.active,
        walletBalance: data.walletBalance,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function loginCustomer() {
    try {
      setLoadingAuth(true);
      setAuthMessage("");

      const response = await fetch("/api/customer-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthMessage(data.error || "No se pudo ingresar.");
        return;
      }

      setLoggedCustomer(data);
      setGuestName(data.name);
      setAuthPassword("");
      setUseWallet(false);
      setAuthMessage("Cuenta ingresada correctamente.");
    } catch (error) {
      console.error(error);
      setAuthMessage("Error al ingresar.");
    } finally {
      setLoadingAuth(false);
    }
  }

  async function registerCustomer() {
    try {
      setLoadingAuth(true);
      setAuthMessage("");

      const response = await fetch("/api/customer-auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthMessage(data.error || "No se pudo crear la cuenta.");
        return;
      }

      setLoggedCustomer(data);
      setGuestName(data.name);
      setAuthPassword("");
      setUseWallet(false);
      setAuthMessage("Cuenta creada correctamente.");
    } catch (error) {
      console.error(error);
      setAuthMessage("Error al crear cuenta.");
    } finally {
      setLoadingAuth(false);
    }
  }

  function logoutCustomer() {
    setLoggedCustomer(null);
    setUseWallet(false);
    setAuthPassword("");
    setAuthMessage("");
  }

  function buildOnlineOrderCustomerComment() {
    return cart
      .filter((item) => item.customerComment.trim())
      .map((item) => `${item.productName}: ${item.customerComment.trim()}`)
      .join(" | ");
  }

  async function createOnlineOrder() {
    try {
      setLoadingOrder(true);
      setMessage("");

      if (cart.length === 0) {
        setMessage("Agrega productos al pedido.");
        return;
      }

      const finalCustomerName = loggedCustomer?.name || guestName.trim();

      if (!finalCustomerName) {
        setMessage("Ingresa tu nombre o entra con tu cuenta.");
        return;
      }

      let scheduledForValue: string | null = null;

      if (fulfillmentType === "scheduled") {
        if (!scheduledDate || !scheduledTime) {
          setMessage("Selecciona fecha y hora para programar el pedido.");
          return;
        }

        if (!selectedDaySchedule) {
          setMessage("La tienda está cerrada ese día. Elige otra fecha.");
          return;
        }

        if (!availableTimeSlots.includes(scheduledTime)) {
          setMessage("Selecciona una hora disponible.");
          return;
        }

        scheduledForValue = `${scheduledDate}T${scheduledTime}:00`;
      }

      const customerComment = buildOnlineOrderCustomerComment();

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: loggedCustomer?.id || null,
          customerName: finalCustomerName,
          customerComment,
          walletAmountUsed: walletAmountToUse,
          totemCode: "online",
          paymentMethod,
          orderSource: "online",
          fulfillmentType,
          scheduledFor: scheduledForValue
            ? new Date(scheduledForValue).toISOString()
            : null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: 1,
            modifierOptionIds: item.modifierOptionIds,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorText = String(data.error || "");

        if (
          errorText.includes("STORE_CLOSED_FOR_IMMEDIATE_ORDER") ||
          errorText.includes("STORE_CLOSED_FOR_SCHEDULED_ORDER")
        ) {
          setMessage("");
          switchToScheduled();
          setClosedStoreModalVisible(true);
          return;
        }

        setMessage(data.error || "No se pudo crear el pedido.");
        return;
      }

      setCart([]);
      setGuestName(loggedCustomer?.name || "");
      setFulfillmentType("immediate");
      setScheduledDate(todayInputDate);
      setScheduledTime("");
      setPaymentMethod("debit_credit");
      setUseWallet(false);

      if (loggedCustomer) {
        await refreshCustomerWallet(loggedCustomer.id);
      }

      const cashbackText =
        loggedCustomer && data.cashbackEarned > 0
          ? ` Cashback ganado: ${formatPrice(data.cashbackEarned)}.`
          : "";

      const walletText =
        walletAmountToUse > 0
          ? ` Saldo usado: ${formatPrice(walletAmountToUse)}.`
          : "";

      setMessage(
        `Pedido online #${data.orderNumber} enviado a cocina.${walletText}${cashbackText}`
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al crear pedido online.");
    } finally {
      setLoadingOrder(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      {closedStoreModalVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
              Tienda cerrada
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Solo puedes hacer pedidos programados
            </h2>

            <p className="mt-3 text-base font-bold text-zinc-500">
              En este momento no estamos tomando pedidos inmediatos. Puedes
              programar tu pedido para más tarde.
            </p>

            <button
              type="button"
              onClick={() => {
                switchToScheduled();
                setClosedStoreModalVisible(false);
                setMessage("");
              }}
              className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white"
            >
              Programar pedido
            </button>

            <button
              type="button"
              onClick={() => setClosedStoreModalVisible(false)}
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-4 text-sm font-black text-zinc-700"
            >
              Seguir viendo catálogo
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-sm font-black text-zinc-400">LOGO</span>
              )}
            </div>

            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: settings.primaryColor }}
              >
                {settings.businessName}
              </p>
              <h1 className="text-xl font-black leading-tight">
                Pedido online
              </h1>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-400">Total</p>
            <p
              className="text-2xl font-black"
              style={{ color: settings.primaryColor }}
            >
              {formatPrice(cartTotal)}
            </p>
          </div>
        </div>

        {scheduleBanner && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-700">
              Horario de atención
            </p>
            <p className="mt-1 text-sm font-bold text-zinc-800">
              {scheduleBanner}
            </p>
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_410px]">
        <section>
          <div className="mb-5">
            <h2 className="text-3xl font-black">Elige tus productos</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Compra online usando el mismo catálogo del local.
            </p>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`rounded-full px-4 py-3 text-sm font-black ${
                selectedCategoryId === "all"
                  ? "text-white"
                  : "bg-white text-zinc-600"
              }`}
              style={{
                background:
                  selectedCategoryId === "all"
                    ? settings.primaryColor
                    : undefined,
              }}
            >
              Todo
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`rounded-full px-4 py-3 text-sm font-black ${
                  selectedCategoryId === category.id
                    ? "text-white"
                    : "bg-white text-zinc-600"
                }`}
                style={{
                  background:
                    selectedCategoryId === category.id
                      ? settings.primaryColor
                      : undefined,
                }}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => openProduct(product)}
                className="overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid min-h-[170px] grid-cols-[150px_1fr]">
                  <div className="flex items-center justify-center bg-white">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-[150px] w-[150px] object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-[150px] w-[150px] items-center justify-center bg-zinc-50 text-xs font-black uppercase text-zinc-400">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col p-4">
                    <h3 className="text-xl font-black leading-tight">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="mt-1 text-sm font-bold text-zinc-500">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-3">
                      <p
                        className="text-2xl font-black"
                        style={{ color: settings.primaryColor }}
                      >
                        {formatPrice(product.price)}
                      </p>

                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-black text-white"
                        style={{ background: settings.primaryColor }}
                      >
                        +
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <h2 className="text-2xl font-black">Tu pedido</h2>

          <section className="mt-4 rounded-2xl bg-zinc-50 p-4">
            {loggedCustomer ? (
              <div>
                <p className="text-xs font-black uppercase text-[#10B557]">
                  Cliente registrado
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Hola, {loggedCustomer.name}
                </h3>

                <p className="mt-1 text-sm font-bold text-zinc-500">
                  {loggedCustomer.email}
                </p>

                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-zinc-500">
                    Saldo disponible
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#10B557]">
                    {formatPrice(loggedCustomer.walletBalance)}
                  </p>

                  {loggedCustomer.walletBalance > 0 && cartTotal > 0 && (
                    <label className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(event) => setUseWallet(event.target.checked)}
                      />
                      <span className="text-sm font-black">
                        Usar saldo en esta compra
                      </span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={logoutCustomer}
                  className="mt-3 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black"
                >
                  Salir de la cuenta
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      authMode === "login"
                        ? "text-white"
                        : "bg-white text-zinc-600"
                    }`}
                    style={{
                      background:
                        authMode === "login" ? settings.primaryColor : undefined,
                    }}
                  >
                    Ingresar
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      authMode === "register"
                        ? "text-white"
                        : "bg-white text-zinc-600"
                    }`}
                    style={{
                      background:
                        authMode === "register"
                          ? settings.primaryColor
                          : undefined,
                    }}
                  >
                    Crear cuenta
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode("guest")}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      authMode === "guest"
                        ? "text-white"
                        : "bg-white text-zinc-600"
                    }`}
                    style={{
                      background:
                        authMode === "guest" ? settings.primaryColor : undefined,
                    }}
                  >
                    Invitado
                  </button>
                </div>

                {authMode === "register" && (
                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Nombre
                    </span>
                    <input
                      value={authName}
                      onChange={(event) => setAuthName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                      placeholder="Ej: Andres"
                    />
                  </label>
                )}

                {authMode !== "guest" ? (
                  <>
                    <label className="mt-4 block">
                      <span className="text-xs font-black uppercase text-zinc-500">
                        Correo
                      </span>
                      <input
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                        placeholder="correo@email.com"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-xs font-black uppercase text-zinc-500">
                        Clave
                      </span>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(event) => setAuthPassword(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                        placeholder="Clave"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={
                        authMode === "login" ? loginCustomer : registerCustomer
                      }
                      disabled={loadingAuth}
                      className="mt-4 w-full rounded-2xl py-3 text-sm font-black text-white disabled:bg-zinc-300"
                      style={{
                        background: loadingAuth
                          ? "#d4d4d8"
                          : settings.primaryColor,
                      }}
                    >
                      {loadingAuth
                        ? "Procesando..."
                        : authMode === "login"
                        ? "Ingresar"
                        : "Crear cuenta"}
                    </button>
                  </>
                ) : (
                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Nombre para el pedido
                    </span>
                    <input
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                      placeholder="Ej: Andres"
                    />
                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      Como invitado no acumulas cashback ni puedes usar saldo.
                    </p>
                  </label>
                )}

                {authMessage && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-xs font-black">
                    {authMessage}
                  </p>
                )}
              </div>
            )}
          </section>

          {cart.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm font-bold text-zinc-500">
              Aún no agregas productos.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{item.productName}</h3>

                      {item.customerComment && (
                        <div className="mt-2 rounded-xl bg-yellow-50 p-3">
                          <p className="text-xs font-black uppercase text-yellow-700">
                            Comentario cocina
                          </p>
                          <p className="mt-1 text-xs font-bold text-zinc-700">
                            {item.customerComment}
                          </p>
                        </div>
                      )}

                      {item.modifiersText.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.modifiersText.map((text) => (
                            <p
                              key={text}
                              className="text-xs font-bold text-zinc-500"
                            >
                              {text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeCartItem(item.id)}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                    >
                      Quitar
                    </button>
                  </div>

                  <p
                    className="mt-3 text-xl font-black"
                    style={{ color: settings.primaryColor }}
                  >
                    {formatPrice(item.total)}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-zinc-200 pt-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType("immediate")}
                className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                  fulfillmentType === "immediate"
                    ? "text-white"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
                style={{
                  background:
                    fulfillmentType === "immediate"
                      ? settings.primaryColor
                      : undefined,
                }}
              >
                Retiro ahora
              </button>

              <button
                type="button"
                onClick={switchToScheduled}
                className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                  fulfillmentType === "scheduled"
                    ? "text-white"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
                style={{
                  background:
                    fulfillmentType === "scheduled"
                      ? settings.primaryColor
                      : undefined,
                }}
              >
                Programar
              </button>
            </div>

            {fulfillmentType === "scheduled" && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Fecha
                  </span>

                  <input
                    type="date"
                    min={todayInputDate}
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Hora disponible
                  </span>

                  <select
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    disabled={!availableTimeSlots.length}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none disabled:bg-zinc-100"
                  >
                    {!availableTimeSlots.length ? (
                      <option value="">No hay horarios disponibles</option>
                    ) : (
                      availableTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                {scheduledDate && !selectedDaySchedule && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    Tienda cerrada ese día. Elige otra fecha.
                  </div>
                )}

                {selectedDaySchedule && (
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    Horario disponible: {selectedDaySchedule.openTime} a{" "}
                    {selectedDaySchedule.closeTime}
                  </div>
                )}
              </div>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Medio de pago
              </span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as "debit_credit" | "food_benefit"
                  )
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="debit_credit">Débito / Crédito</option>
                <option value="food_benefit">Beneficio alimentación</option>
              </select>
            </label>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
              {message}
            </p>
          )}

          <div className="mt-5 space-y-2 rounded-2xl bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-zinc-500">Subtotal</p>
              <p className="text-lg font-black">{formatPrice(cartTotal)}</p>
            </div>

            {walletAmountToUse > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-zinc-500">Saldo usado</p>
                <p className="text-lg font-black text-red-600">
                  - {formatPrice(walletAmountToUse)}
                </p>
              </div>
            )}

            <div className="border-t border-zinc-200 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black">Total a pagar</p>
                <p
                  className="text-3xl font-black"
                  style={{ color: settings.primaryColor }}
                >
                  {formatPrice(totalToPay)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={createOnlineOrder}
            disabled={loadingOrder || cart.length === 0}
            className="mt-4 w-full rounded-2xl py-4 text-lg font-black text-white disabled:bg-zinc-300"
            style={{
              background:
                !loadingOrder && cart.length > 0
                  ? settings.primaryColor
                  : undefined,
            }}
          >
            {loadingOrder ? "Enviando..." : "Confirmar pedido online"}
          </button>
        </aside>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: settings.primaryColor }}
                >
                  Personaliza
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  {selectedProduct.name}
                </h2>
                <p
                  className="mt-2 text-3xl font-black"
                  style={{ color: settings.primaryColor }}
                >
                  {formatPrice(selectedProduct.price)}
                </p>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {activeModifierGroups.map((group) => {
                const selected = selectedOptionsByGroup[group.id] || [];

                return (
                  <section
                    key={group.id}
                    className="rounded-3xl border border-zinc-200 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black">
                          {group.template.name}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          Min: {group.min} / Max: {group.max}
                          {group.required ? " / Obligatorio" : ""}
                        </p>
                      </div>

                      {group.required && selected.length < group.min && (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                          Falta seleccionar
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {group.template.options.map((option) => {
                        const isSelected = selected.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleOption(group, option.id)}
                            className="relative rounded-2xl border bg-white p-3 text-center"
                            style={{
                              borderColor: isSelected
                                ? settings.primaryColor
                                : "#e4e4e7",
                            }}
                          >
                            <div className="flex flex-col items-center gap-2">
                              {option.imageUrl ? (
                                <img
                                  src={option.imageUrl}
                                  alt={option.name}
                                  className="h-16 w-20 object-contain"
                                />
                              ) : (
                                <div className="flex h-16 w-20 items-center justify-center text-xs font-black text-zinc-400">
                                  Sin foto
                                </div>
                              )}

                              <p className="text-sm font-black leading-tight">
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
                              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white"
                              style={{
                                background: isSelected
                                  ? settings.primaryColor
                                  : "#ffffff",
                                border: isSelected
                                  ? "none"
                                  : "2px solid #d4d4d8",
                              }}
                            >
                              {isSelected ? "✓" : ""}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Comentario para cocina
                </span>

                <textarea
                  value={selectedProductComment}
                  onChange={(event) =>
                    setSelectedProductComment(event.target.value.slice(0, 180))
                  }
                  placeholder="Ej: Con poca salsa"
                  rows={3}
                  className="mt-3 w-full resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#10B557]"
                />

                <p className="mt-2 text-xs font-bold text-zinc-500">
                  Este comentario aparecerá en cocina y en la comanda.
                </p>
              </label>
            </div>

            <button
              onClick={addConfiguredProduct}
              disabled={!canAddSelectedProduct()}
              className="mt-5 w-full rounded-2xl py-4 text-lg font-black text-white disabled:bg-zinc-300"
              style={{
                background: canAddSelectedProduct()
                  ? settings.primaryColor
                  : undefined,
              }}
            >
              Agregar al pedido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
