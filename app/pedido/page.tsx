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
  available?: boolean;
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
  channelVisibility?: string;
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
  manualBalance?: number;
  cashbackBalance?: number;
  expiredCashback?: number;
  cashbackCredits?: number;
  nextCashbackExpiration?: string | null;
  nextCashbackAmount?: number;
};

type WalletSummary = {
  totalBalance: number;
  manualBalance: number;
  cashbackBalance: number;
  expiredCashback: number;
  cashbackCredits: number;
  manualCredits: number;
  nextCashbackExpiration: string | null;
  nextCashbackAmount: number;
  cashbackExpirations?: {
    amount: number;
    expiresAt: string | null;
  }[];
};

type WalletHistoryTransaction = {
  id: number;
  type: string;
  amount: number;
  reason: string;
  orderId: number | null;
  expiresAt: string | null;
  createdAt: string;
  origin: string;
};

type CustomerOrderHistoryModifier = {
  id: number;
  groupName: string;
  optionName: string;
  price: number;
};

type CustomerOrderHistoryItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  total: number;
  productName: string;
  modifiers: CustomerOrderHistoryModifier[];
};

type CustomerOrderHistory = {
  id: number;
  orderNumber: number;
  status: string;
  total: number;
  subtotalAmount: number;
  discountAmount: number;
  discountPercent: number;
  discountCouponCode: string;
  tipAmount: number;
  walletAmountUsed: number;
  cashbackEarned: number;
  paymentMethod: string;
  orderSource: string;
  fulfillmentType: string;
  scheduledFor: string | null;
  customerComment: string;
  createdAt: string;
  items: CustomerOrderHistoryItem[];
};

type AppliedCoupon = {
  id: number;
  name: string;
  code: string;
  percent: number;
};

type OpeningHour = {
  dayOfWeek: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
};

type DeliveryQuote = {
  publicId: string;
  fee: number;
  currency: string;
  expiresAt: string | null;
  duration?: number | null;
  dropoffEta?: string | null;
};

const defaultSettings: Settings = {
  businessName: "Mi negocio",
  kioskTitle: "Pedido online",
  kioskSubtitle: "Compra online y retira en local",
  logoUrl: null,
  primaryColor: "#10B557",
};

const instagramUrl = "https://www.instagram.com/uwa_chile/";
const whatsappUrl = "https://api.whatsapp.com/send?phone=56997971213&text=Hola%2C%20vengo%20de%20pedidos%20online%2C%20necesito%20ayuda.";
// SOCIAL_LINKS_UWA

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}


function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBeverageProduct(product: Product) {
  const text = normalizeText(`${product.name} ${product.category?.name || ""}`);

  return (
    text.includes("bebida") ||
    text.includes("jugo") ||
    text.includes("agua") ||
    text.includes("coca") ||
    text.includes("vital")
  );
}

function isBestSellerProduct(product: Product, bestSellerProductId: number | null) {
  return Boolean(
    bestSellerProductId &&
      product.id === bestSellerProductId &&
      !isBeverageProduct(product)
  );
}
function formatShortDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOrderStatus(value: string) {
  if (value === "ready") return "Listo";
  if (value === "cancelled") return "Cancelado";
  return "Pendiente";
}

function formatOrderSource(value: string) {
  if (value === "online") return "Online";
  return "Tótem";
}

function formatUberDeliveryStatus(value: string | null) {
  if (!value) return "Delivery creado";
  const normalized = value.toLowerCase();

  if (normalized.includes("delivered")) return "Entregado";
  if (normalized.includes("pickup")) return "Retirado por repartidor";
  if (normalized.includes("courier")) return "Repartidor asignado";
  if (normalized.includes("created")) return "Delivery creado";
  if (normalized.includes("pending")) return "Buscando repartidor";
  if (normalized.includes("canceled") || normalized.includes("cancelled")) return "Cancelado";

  return value;
}

function formatUberEta(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFulfillment(value: string) {
  if (value === "scheduled") return "Programado";
  return "Retiro ahora";
}

function cleanCheckoutMessage(value: string) {
  const text = String(value || "");

  if (
    text.includes("STORE_CLOSED") ||
    text.includes("HARD_LOCK_STORE_CLOSED")
  ) {
    return "Tienda cerrada. Por ahora solo puedes programar tu pedido para retiro.";
  }

  return text;
}

function formatPaymentMethod(value: string) {
  if (value === "food_benefit") return "Beneficio alimentación";
  if (value === "debit_credit") return "Débito / Crédito";
  return value || "No informado";
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
  const [bestSellerProductId, setBestSellerProductId] = useState<number | null>(null);
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
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [cashbackDetailVisible, setCashbackDetailVisible] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "guest">(
    "login"
  );
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  const [fulfillmentType, setFulfillmentType] = useState<
    "immediate" | "scheduled" | "delivery"
  >("immediate");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Concepción");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quotingDelivery, setQuotingDelivery] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"debit_credit">("debit_credit");

  const [message, setMessage] = useState("");
  const [catalogChangeMessage, setCatalogChangeMessage] = useState("");
  const [closedStoreModalVisible, setClosedStoreModalVisible] = useState(false);
  const [storeOpenForImmediate, setStoreOpenForImmediate] = useState(true);
  const [storeStatusLoaded, setStoreStatusLoaded] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [walletHistoryVisible, setWalletHistoryVisible] = useState(false);
  const [walletHistoryLoading, setWalletHistoryLoading] = useState(false);
  const [walletHistoryTransactions, setWalletHistoryTransactions] = useState<WalletHistoryTransaction[]>([]);
  const [orderHistoryVisible, setOrderHistoryVisible] = useState(false);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistoryOrders, setOrderHistoryOrders] = useState<CustomerOrderHistory[]>([]);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponsVisible, setCouponsVisible] = useState(true);

  function showCatalogChangeMessage(message: string) {
    setMessage(message);
    setCatalogChangeMessage(message);
  }

  function buildCatalogChangeMessage(details: string[]) {
    const cleanDetails = Array.from(
      new Set(details.map((item) => item.trim()).filter(Boolean))
    );

    if (cleanDetails.length === 0) {
      return "Lo sentimos, una opcion ya no esta disponible. Elige otra opcion para continuar.";
    }

    if (cleanDetails.length === 1) {
      return `Lo sentimos, ${cleanDetails[0]} ya no esta disponible. Elige otra opcion para continuar.`;
    }

    return `Lo sentimos, estas opciones ya no estan disponibles: ${cleanDetails.join(", ")}. Elige otras opciones para continuar.`;
  }

  function getOnlineProductFromCatalog(productId: number): Product | null {
    const product = products.find(
      (candidate) =>
        candidate.id === productId &&
        candidate.active !== false &&
        candidate.category?.active !== false
    );

    if (!product) return null;

    const modifierGroups = (product.modifierGroups || [])
      .filter((group) => group.active !== false)
      .filter(
        (group) =>
          !group.channelVisibility ||
          group.channelVisibility === "all" ||
          group.channelVisibility === "online"
      )
      .filter((group) => group.template)
      .map((group) => ({
        ...group,
        template: {
          ...group.template,
          options: (group.template.options || [])
            .filter((option) => option.active !== false && option.available !== false)
            .sort((a, b) => a.order - b.order || a.id - b.id),
        },
      }))
      .filter((group) => group.template.options.length > 0)
      .sort((a, b) => a.order - b.order || a.id - b.id);

    return {
      ...product,
      modifierGroups,
    };
  }


  async function loadBestSeller() {
    try {
      const response = await fetch("/api/totem/best-sellers?days=30", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setBestSellerProductId(null);
        return;
      }

      setBestSellerProductId(
        typeof data.bestSellerProductId === "number"
          ? data.bestSellerProductId
          : null
      );
    } catch (error) {
      console.error(error);
      setBestSellerProductId(null);
    }
  }
  async function loadInitialData() {
    try {
      const [settingsResponse, productsResponse, hoursResponse] =
        await Promise.all([
          fetch("/api/settings"),
          fetch("/api/products", { cache: "no-store" }),
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

      const couponSettingsResponse = await fetch("/api/settings/coupons", {
        cache: "no-store",
      });

      if (couponSettingsResponse.ok) {
        const couponSettingsData = await couponSettingsResponse.json();
        setCouponsVisible(couponSettingsData.couponsVisible ?? true);
      }
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar el catalogo.");
    }
  }

  useEffect(() => {
    loadInitialData();
    loadBestSeller();
    const productsInterval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const productsData = await response.json();
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (error) {
        console.error(error);
      }
    }, 3000);

    const bestSellerInterval = window.setInterval(() => {
      }, 300000);

    return () => {
      window.clearInterval(productsInterval);
      window.clearInterval(bestSellerInterval);
    };
  }, []);

  // PEDIDO_CART_SYNC_CATALOG

  useEffect(() => {
    if (cart.length === 0 || products.length === 0) return;

    let changed = false;
    let removedSomething = false;
    const removedDetails: string[] = [];
    const nextCart: CartItem[] = [];

    for (const item of cart) {
      const product = getOnlineProductFromCatalog(item.productId);

      if (!product) {
        changed = true;
        removedSomething = true;
        removedDetails.push(item.productName);
        continue;
      }

      const optionContext = new Map<
        number,
        { groupId: number; groupName: string; option: ModifierOption }
      >();

      for (const group of product.modifierGroups || []) {
        for (const option of group.template.options || []) {
          optionContext.set(option.id, {
            groupId: group.id,
            groupName: group.template.name,
            option,
          });
        }
      }

      const selectedOptionIds = item.modifierOptionIds || [];
      const validOptionIds = selectedOptionIds.filter((optionId) =>
        optionContext.has(optionId)
      );

      if (validOptionIds.length !== selectedOptionIds.length) {
        changed = true;

        selectedOptionIds.forEach((optionId, index) => {
          if (!validOptionIds.includes(optionId)) {
            removedDetails.push(item.modifiersText[index] || "Opcion");
          }
        });
      }

      let invalidRequiredGroup = false;

      for (const group of product.modifierGroups || []) {
        const selectedCount = validOptionIds.filter((optionId) =>
          group.template.options.some((option) => option.id === optionId)
        ).length;

        if (group.required && selectedCount < group.min) {
          invalidRequiredGroup = true;
          break;
        }

        if (group.max > 0 && selectedCount > group.max) {
          invalidRequiredGroup = true;
          break;
        }
      }

      if (invalidRequiredGroup) {
        changed = true;
        removedSomething = true;

        if (!removedDetails.length) {
          removedDetails.push(item.productName);
        }

        continue;
      }

      const modifiersText = validOptionIds.map((optionId) => {
        const context = optionContext.get(optionId);
        return context
          ? `${context.groupName}: ${context.option.name}`
          : "";
      }).filter(Boolean);

      const modifiersTotal = validOptionIds.reduce((sum, optionId) => {
        const context = optionContext.get(optionId);
        return sum + Number(context?.option.price || 0);
      }, 0);

      const nextItem: CartItem = {
        ...item,
        productName: product.name,
        total: product.price + modifiersTotal,
        modifierOptionIds: validOptionIds,
        modifiersText,
      };

      if (
        item.productName !== nextItem.productName ||
        item.total !== nextItem.total ||
        JSON.stringify(item.modifierOptionIds) !==
          JSON.stringify(nextItem.modifierOptionIds) ||
        JSON.stringify(item.modifiersText) !== JSON.stringify(nextItem.modifiersText)
      ) {
        changed = true;
      }

      nextCart.push(nextItem);
    }

    if (!changed) return;

    setCart(nextCart);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    showCatalogChangeMessage(buildCatalogChangeMessage(removedDetails));
  }, [products]);

  useEffect(() => {
    if (!selectedProduct || products.length === 0) return;

    const latestProduct = getOnlineProductFromCatalog(selectedProduct.id);

    if (!latestProduct) {
      setSelectedProduct(null);
      setSelectedOptionsByGroup({});
      showCatalogChangeMessage(
        "Lo sentimos, este producto ya no esta disponible. Elige otro producto para continuar."
      );
      return;
    }

    const allowedByGroup = new Map<number, Set<number>>();

    for (const group of latestProduct.modifierGroups || []) {
      allowedByGroup.set(
        group.id,
        new Set(group.template.options.map((option) => option.id))
      );
    }

    let changed = false;
    const removedSelectedDetails: string[] = [];
    const nextOptionsByGroup: Record<number, number[]> = {};

    for (const [groupIdText, selectedIds] of Object.entries(
      selectedOptionsByGroup
    )) {
      const groupId = Number(groupIdText);
      const allowedOptions = allowedByGroup.get(groupId);

      if (!allowedOptions) {
        changed = true;
        continue;
      }

      const validIds = selectedIds.filter((optionId) =>
        allowedOptions.has(optionId)
      );

      if (validIds.length !== selectedIds.length) {
        changed = true;

        const originalGroup = selectedProduct.modifierGroups?.find(
          (group) => group.id === groupId
        );

        selectedIds.forEach((optionId) => {
          if (!validIds.includes(optionId)) {
            const option = originalGroup?.template.options.find(
              (item) => item.id === optionId
            );

            if (option) {
              removedSelectedDetails.push(
                `${originalGroup?.template.name || "Opcion"}: ${option.name}`
              );
            }
          }
        });
      }

      if (validIds.length > 0) {
        nextOptionsByGroup[groupId] = validIds;
      }
    }

    setSelectedProduct(latestProduct);

    if (changed) {
      setSelectedOptionsByGroup(nextOptionsByGroup);
      showCatalogChangeMessage(buildCatalogChangeMessage(removedSelectedDetails));
    }
  }, [products]);
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
      .filter((group) => !group.channelVisibility || group.channelVisibility === "all" || group.channelVisibility === "online")
      .filter((group) => group.template)
      .map((group) => ({
        ...group,
        template: {
          ...group.template,
          options: (group.template.options || [])
            .filter((option) => option.active !== false && option.available !== false)
            .sort((a, b) => a.order - b.order || a.id - b.id),
        },
      }))
      .filter((group) => group.template.options.length > 0)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [selectedProduct]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const couponDiscountAmount = appliedCoupon
    ? Math.min(cartTotal, Math.round(cartTotal * (appliedCoupon.percent / 100)))
    : 0;

  const subtotalAfterDiscount = Math.max(0, cartTotal - couponDiscountAmount);

  const deliveryFee =
    fulfillmentType === "delivery" && deliveryQuote ? deliveryQuote.fee : 0;

  const totalBeforeWallet = subtotalAfterDiscount + deliveryFee;

  const walletAmountToUse = useMemo(() => {
    if (!loggedCustomer || !useWallet) return 0;
    return Math.min(loggedCustomer.walletBalance, totalBeforeWallet);
  }, [loggedCustomer, useWallet, totalBeforeWallet]);

  const totalToPay = Math.max(0, totalBeforeWallet - walletAmountToUse);

  const immediateOrderingBlocked = storeStatusLoaded && !storeOpenForImmediate;

  function showClosedStoreAndSchedule() {
    setFulfillmentType("scheduled");
    setDeliveryQuote(null);
    setClosedStoreModalVisible(true);
    setMessage("Tienda cerrada. Solo puedes programar tu pedido para retiro.");
  }


  async function refreshStoreStatusForOrdering() {
    try {
      const response = await fetch("/api/store-status", { cache: "no-store" });
      const data = await response.json();

      const isOpen = Boolean(data.isOpen);

      setStoreOpenForImmediate(isOpen);
      setStoreStatusLoaded(true);

      if (!isOpen) {
        setFulfillmentType("scheduled");
        setDeliveryQuote(null);
      }

      return isOpen;
    } catch (error) {
      console.error("STORE_STATUS_FRONTEND_ERROR", error);

      setStoreOpenForImmediate(false);
      setStoreStatusLoaded(true);
      setFulfillmentType("scheduled");
      setDeliveryQuote(null);

      return false;
    }
  }

  function showClosedStoreAndForceSchedule() {
    setFulfillmentType("scheduled");
    setDeliveryQuote(null);
    setClosedStoreModalVisible(true);
    setMessage("Tienda cerrada. Por ahora solo puedes programar retiro.");
  }

  // CANDADO_TOTAL_FRONTEND_TIENDA_CERRADA

  useEffect(() => {
    refreshStoreStatusForOrdering().then((isOpen) => {
      if (!isOpen) {
        setClosedStoreModalVisible(true);
      }
    });

    const interval = window.setInterval(() => {
      refreshStoreStatusForOrdering();
    }, 60000);

    const onFocus = () => {
      refreshStoreStatusForOrdering();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

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

  async function loadWalletSummary(customerId: number) {
    try {
      const response = await fetch(
        `/api/customer-wallet/summary?customerId=${customerId}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) return;

      setWalletSummary(data);

      setLoggedCustomer((current) =>
        current
          ? {
              ...current,
              walletBalance: data.totalBalance,
              manualBalance: data.manualBalance,
              cashbackBalance: data.cashbackBalance,
              expiredCashback: data.expiredCashback,
              cashbackCredits: data.cashbackCredits,
              nextCashbackExpiration: data.nextCashbackExpiration,
              nextCashbackAmount: data.nextCashbackAmount,
            }
          : current
      );
    } catch (error) {
      console.error(error);
    }
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
      await loadWalletSummary(data.id);
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
      await loadWalletSummary(data.id);
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

  async function openWalletHistory() {
    if (!loggedCustomer) return;

    try {
      setWalletHistoryLoading(true);
      setWalletHistoryVisible(true);

      const response = await fetch("/api/customer-auth/wallet-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: loggedCustomer!.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWalletHistoryTransactions([]);
        return;
      }

      setWalletHistoryTransactions(
        Array.isArray(data.transactions) ? data.transactions : []
      );
    } catch (error) {
      console.error(error);
      setWalletHistoryTransactions([]);
    } finally {
      setWalletHistoryLoading(false);
    }
  }

  async function openOrderHistory() {
    if (!loggedCustomer) return;

    try {
      setOrderHistoryLoading(true);
      setOrderHistoryVisible(true);

      const response = await fetch("/api/customer-auth/order-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: loggedCustomer!.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOrderHistoryOrders([]);
        return;
      }

      setOrderHistoryOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error(error);
      setOrderHistoryOrders([]);
    } finally {
      setOrderHistoryLoading(false);
    }
  }

  function logoutCustomer() {
    setLoggedCustomer(null);
    setWalletSummary(null);
    setCashbackDetailVisible(false);
    setUseWallet(false);
    setAuthPassword("");
    setAuthMessage("");
  }

  async function applyCoupon() {
    try {
      setCouponMessage("");

      if (cart.length === 0) {
        setCouponMessage("Agrega productos antes de usar un cupón.");
        return;
      }

      const cleanCode = couponCode.trim().toUpperCase().replace(/\s+/g, "");

      if (!cleanCode) {
        setCouponMessage("Ingresa un cupón.");
        return;
      }

      setValidatingCoupon(true);

      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cleanCode,
          subtotal: cartTotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAppliedCoupon(null);
        setCouponMessage(data.error || "Cupón inválido.");
        return;
      }

      setAppliedCoupon({
        id: data.id,
        name: data.name,
        code: data.code,
        percent: data.percent,
      });
      setCouponCode(data.code);
      setCouponMessage(`Cupón aplicado: ${data.name}`);
    } catch (error) {
      console.error(error);
      setCouponMessage("Error al validar el cupón.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  }

  function buildOnlineOrderCustomerComment() {
    return cart
      .filter((item) => item.customerComment.trim())
      .map((item) => `${item.productName}: ${item.customerComment.trim()}`)
      .join(" | ");
  }

  async function quoteDelivery() {
    try {
      setMessage("");

      const finalCustomerName = loggedCustomer?.name || guestName.trim();

      if (cart.length === 0) {
        setMessage("Agrega productos antes de cotizar delivery.");
        return;
      }

      if (!finalCustomerName) {
        setMessage("Ingresa tu nombre antes de cotizar delivery.");
        return;
      }

      if (!deliveryAddress.trim()) {
        setMessage("Ingresa la dirección de entrega.");
        return;
      }

      if (!deliveryPhone.trim()) {
        setMessage("Ingresa un teléfono de contacto.");
        return;
      }

      setQuotingDelivery(true);
      setDeliveryQuote(null);

      const response = await fetch("/api/uber-direct/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: finalCustomerName,
          phone: deliveryPhone,
          street: deliveryAddress,
          instructions: deliveryInstructions,
          city: deliveryCity,
          state: "Biobío",
          zipCode: "4030000",
          country: "CL",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(cleanCheckoutMessage(data.error || "No se pudo cotizar el delivery."));
        return;
      }

      setDeliveryQuote({
        publicId: data.publicId,
        fee: Number(data.fee || 0),
        currency: data.currency || "CLP",
        expiresAt: data.expiresAt || null,
        duration: data.duration || null,
        dropoffEta: data.dropoffEta || null,
      });

      setMessage("Delivery cotizado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error al cotizar delivery.");
    } finally {
      setQuotingDelivery(false);
    }
  }

  async function createOnlineOrder() {
    try {
      setLoadingOrder(true);

      const storeIsOpenNow = await refreshStoreStatusForOrdering();

      if (!storeIsOpenNow && fulfillmentType !== "scheduled") {
        showClosedStoreAndForceSchedule();
        setMessage("No se puede pagar con Retiro ahora o Delivery mientras la tienda está cerrada. Programa tu pedido para retiro.");
        setLoadingOrder(false);
        return;
      }

      if (immediateOrderingBlocked && fulfillmentType !== "scheduled") {
        showClosedStoreAndSchedule();
        setMessage("No se puede pagar un pedido inmediato con la tienda cerrada. Programa tu pedido para retiro.");
        setLoadingOrder(false);
        return;
      }
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

      if (fulfillmentType === "delivery") {
        if (!deliveryAddress.trim()) {
          setMessage("Ingresa la dirección de entrega.");
          return;
        }

        if (!deliveryPhone.trim()) {
          setMessage("Ingresa un teléfono de contacto.");
          return;
        }

        if (!deliveryQuote) {
          setMessage("Debes cotizar el delivery antes de pagar.");
          return;
        }
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

      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flow: "personal_order",
          customerId: loggedCustomer!.id,
          customerName: finalCustomerName,
          customerEmail: loggedCustomer!.email || authEmail.trim() || null,
          discountCouponCode: appliedCoupon?.code || null,
          customerComment,
          walletAmountUsed: walletAmountToUse,
          orderSource: "online",
          fulfillmentType: fulfillmentType === "delivery" ? "immediate" : fulfillmentType,
          deliveryMethod: fulfillmentType === "delivery" ? "uber_direct" : "pickup",
          deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : "",
          deliveryCity: fulfillmentType === "delivery" ? deliveryCity : "",
          deliveryPhone: fulfillmentType === "delivery" ? deliveryPhone : "",
          deliveryInstructions: fulfillmentType === "delivery" ? deliveryInstructions : "",
          uberQuotePublicId: fulfillmentType === "delivery" ? deliveryQuote?.publicId || null : null,
          uberDeliveryFee: fulfillmentType === "delivery" ? deliveryFee : 0,
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
        setMessage(data.error || "No se pudo iniciar el pago con Mercado Pago.");
        return;
      }

      const paymentUrl =
        data.checkoutUrl ||
        (data.environment === "production"
          ? data.initPoint
          : data.sandboxInitPoint || data.initPoint);

      if (!paymentUrl) {
        setMessage("Mercado Pago no devolvió URL de pago.");
        return;
      }

      setMessage("Redirigiendo a Mercado Pago...");
      window.location.href = paymentUrl;
    } catch (error) {
      console.error(error);
      setMessage("Error al iniciar pago con Mercado Pago.");
    } finally {
      setLoadingOrder(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      {/* SOCIAL_FLOATING_BUTTONS_UWA */}
      <div className="fixed bottom-5 right-5 z-[9000] flex flex-col gap-3">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram ÜWA"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-950 shadow-2xl ring-1 ring-zinc-200 transition hover:scale-105 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp ÜWA"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
            <path d="M16.04 4C9.43 4 4.05 9.28 4.05 15.78c0 2.08.56 4.11 1.63 5.9L4 28l6.48-1.64a12.2 12.2 0 0 0 5.56 1.36c6.61 0 11.99-5.28 11.99-11.78S22.65 4 16.04 4Zm0 21.67c-1.78 0-3.52-.47-5.04-1.36l-.36-.21-3.84.97.99-3.65-.24-.38a9.67 9.67 0 0 1-1.48-5.26c0-5.36 4.47-9.73 9.97-9.73 5.49 0 9.96 4.37 9.96 9.73s-4.47 9.89-9.96 9.89Zm5.46-7.31c-.3-.15-1.77-.86-2.05-.96-.27-.1-.47-.15-.67.15-.2.29-.77.96-.95 1.16-.17.19-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.46-.89-.78-1.49-1.75-1.66-2.04-.17-.29-.02-.45.13-.6.13-.13.3-.34.45-.51.15-.17.2-.29.3-.49.1-.19.05-.36-.02-.51-.08-.15-.67-1.59-.92-2.18-.24-.57-.49-.49-.67-.5h-.57c-.2 0-.52.07-.8.36-.27.29-1.05 1.01-1.05 2.47s1.08 2.87 1.23 3.07c.15.19 2.13 3.2 5.16 4.49.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.77-.71 2.02-1.4.25-.69.25-1.28.17-1.4-.07-.12-.27-.19-.57-.34Z" />
          </svg>
        </a>
      </div>
      {walletHistoryVisible && loggedCustomer && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Historial billetera
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {loggedCustomer.name}
                </h2>

                <p className="mt-1 text-sm font-bold text-zinc-500">
                  {loggedCustomer.email}
                </p>
              </div>

              <button suppressHydrationWarning
                type="button"
                onClick={() => setWalletHistoryVisible(false)}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-5 rounded-3xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase text-zinc-500">
                Saldo disponible
              </p>
              <p className="mt-1 text-4xl font-black text-[#10B557]">
                {formatPrice(loggedCustomer.walletBalance)}
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-4 font-black">Fecha</th>
                    <th className="p-4 font-black">Origen</th>
                    <th className="p-4 font-black">Tipo</th>
                    <th className="p-4 font-black">Monto</th>
                    <th className="p-4 font-black">Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {walletHistoryLoading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center font-black text-zinc-500">
                        Cargando historial...
                      </td>
                    </tr>
                  ) : walletHistoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center font-black text-zinc-500">
                        Sin movimientos.
                      </td>
                    </tr>
                  ) : (
                    walletHistoryTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-zinc-200">
                        <td className="p-4 font-bold">
                          {formatDateTime(transaction.createdAt)}
                        </td>

                        <td className="p-4 font-black">
                          {transaction.origin}
                        </td>

                        <td className="p-4 font-black">
                          {transaction.type === "credit" ? "Abono" : "Descuento"}
                        </td>

                        <td
                          className={`p-4 font-black ${
                            transaction.type === "credit"
                              ? "text-[#10B557]"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "credit" ? "+ " : "- "}
                          {formatPrice(transaction.amount)}
                        </td>

                        <td className="p-4">
                          {transaction.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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

            <button suppressHydrationWarning
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

            <button suppressHydrationWarning
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
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 md:flex-row md:gap-10">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-700">
                  Horario de atención
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {scheduleBanner}
                </p>
              </div>

              <div className="hidden h-10 w-px bg-emerald-200 md:block" />

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-700">
                  <span className="mr-1 tracking-normal">📍</span> Ubicación
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  Plaza Perú 127, Concepción
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* PEDIDO_CATALOG_CHANGE_MODAL */}
      {catalogChangeMessage && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
              Catalogo actualizado
            </p>

            <h2 className="mt-3 text-3xl font-black text-zinc-950">
              Opcion no disponible
            </h2>

            <p className="mt-4 text-lg font-bold leading-relaxed text-zinc-600">
              {catalogChangeMessage}
            </p>

            <button
              type="button"
              onClick={() => {
                setCatalogChangeMessage("");
                setMessage("");
              }}
              className="mt-7 w-full rounded-2xl bg-[#10B557] py-5 text-xl font-black text-white shadow-lg active:scale-[0.98]"
            >
              Elegir otra opcion
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_410px]">
        <section>
                    <div className="mb-5 overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p
              className="text-[11px] font-black uppercase tracking-[0.25em]"
              style={{ color: settings.primaryColor }}
            >
              Bowls frescos · rápidos · al momento
            </p>

            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.05em] text-zinc-950">
              Arma tu bowl perfecto 😍
            </h2>

            <p className="mt-3 text-base font-bold text-zinc-500">
              Elige tus ingredientes favoritos y nosotros lo preparamos al momento.
            </p>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
            <button suppressHydrationWarning
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
              <button suppressHydrationWarning
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
              <button suppressHydrationWarning
                key={product.id}
                onClick={() => openProduct(product)}
                className="overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid min-h-[170px] grid-cols-[150px_1fr]">
                  <div className="relative flex items-center justify-center bg-white">
                    <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                      {isBestSellerProduct(product, bestSellerProductId) && (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-orange-700">
                          🔥 Más vendido
                        </span>
                      )}

                      {!isBeverageProduct(product) && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-emerald-700">
                          Sin gluten
                        </span>
                      )}
                    </div>

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
                  <div className="mt-4 grid gap-2">
                    <div className="rounded-2xl bg-zinc-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase text-zinc-500">
                          Saldo recarga
                        </span>
                        <strong className="text-sm font-black">
                          {formatPrice(walletSummary?.manualBalance ?? loggedCustomer.manualBalance ?? 0)}
                        </strong>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase text-emerald-700">
                          Cashback disponible
                        </span>
                        <strong className="text-sm font-black text-[#10B557]">
                          {formatPrice(walletSummary?.cashbackBalance ?? loggedCustomer.cashbackBalance ?? 0)}
                        </strong>
                      </div>

                      {(walletSummary?.nextCashbackExpiration || loggedCustomer.nextCashbackExpiration) ? (
                        <p className="mt-1 text-xs font-bold text-emerald-700">
                          Próximo vencimiento: {formatPrice(walletSummary?.nextCashbackAmount ?? loggedCustomer.nextCashbackAmount ?? 0)} vence el {formatShortDate(walletSummary?.nextCashbackExpiration || loggedCustomer.nextCashbackExpiration)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-bold text-zinc-500">
                          Sin cashback vigente por vencer.
                        </p>
                      )}

                      {(walletSummary?.cashbackExpirations?.length || 0) > 0 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCashbackDetailVisible((current) => !current)
                            }
                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700"
                          >
                            {cashbackDetailVisible ? "Ocultar detalle" : "Ver detalle cashback"}
                          </button>

                          {cashbackDetailVisible && (
                            <div className="mt-2 space-y-2">
                              {(walletSummary?.cashbackExpirations || []).map(
                                (item, index) => (
                                  <div
                                    key={`${item.expiresAt || "sin-vencimiento"}-${index}`}
                                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-black"
                                  >
                                    <span>{formatPrice(item.amount)}</span>
                                    <span className="text-emerald-700">
                                      {item.expiresAt
                                        ? `Vence ${formatShortDate(item.expiresAt)}`
                                        : "Sin vencimiento"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {(walletSummary?.expiredCashback || loggedCustomer.expiredCashback || 0) > 0 && (
                      <div className="rounded-2xl bg-red-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase text-red-600">
                            Cashback vencido
                          </span>
                          <strong className="text-sm font-black text-red-600">
                            {formatPrice(walletSummary?.expiredCashback ?? loggedCustomer.expiredCashback ?? 0)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {loggedCustomer.walletBalance > 0 && cartTotal > 0 && (
                    <label className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                      <input suppressHydrationWarning
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <button suppressHydrationWarning
                    type="button"
                    onClick={logoutCustomer}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black"
                  >
                    Salir de la cuenta
                  </button>

                  <button suppressHydrationWarning
                    type="button"
                    onClick={openWalletHistory}
                    className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white"
                  >
                    Ver historial
                  </button>

                  <button suppressHydrationWarning
                    type="button"
                    onClick={openOrderHistory}
                    className="rounded-xl bg-[#10B557] px-4 py-2 text-xs font-black text-white"
                  >
                    Mis pedidos
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <button suppressHydrationWarning
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

                  <button suppressHydrationWarning
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
                </div>

                {authMode === "register" && (
                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Nombre
                    </span>
                    <input suppressHydrationWarning
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
                      <input suppressHydrationWarning
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
                      <input suppressHydrationWarning
                        type="password"
                        value={authPassword}
                        onChange={(event) => setAuthPassword(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
                        placeholder="Clave"
                      />
                    </label>

                    {authMode === "login" && (
                      <a
                        href="/recuperar-clave?type=customer"
                        className="mt-3 block text-center text-sm font-black text-[#10B557]"
                      >
                        Olvidaste tu clave?
                      </a>
                    )}
                    <button suppressHydrationWarning
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
                      Cuenta obligatoria
                    </span>
                    <p className="mt-2 rounded-2xl bg-yellow-50 p-4 text-sm font-black text-yellow-800">
                      Para pedir online debes ingresar o crear una cuenta. Así podrás ver el seguimiento Uber y tu historial de pedidos.
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

                    <button suppressHydrationWarning
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
              <button suppressHydrationWarning
                type="button"
                onClick={() => {
                  setFulfillmentType("immediate");
                  setDeliveryQuote(null);
                }}
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

              <button suppressHydrationWarning
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

              <button suppressHydrationWarning
                type="button"
                onClick={() => {
                  setFulfillmentType("delivery");
                  setDeliveryQuote(null);
                }}
                className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                  fulfillmentType === "delivery"
                    ? "text-white"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
                style={{
                  background:
                    fulfillmentType === "delivery"
                      ? settings.primaryColor
                      : undefined,
                }}
              >
                Delivery
              </button>
            </div>

            {immediateOrderingBlocked && (
              <div className="mt-4 rounded-3xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-700">
                  Tienda cerrada
                </p>
                <p className="mt-2 text-sm font-bold text-yellow-950">
                  Solo pedidos programados para retiro. Retiro ahora y Delivery se activan cuando estemos dentro del horario de atención.
                </p>
              </div>
            )}

            {fulfillmentType === "scheduled" && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Fecha
                  </span>

                  <input suppressHydrationWarning
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

                  <select suppressHydrationWarning
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

            {fulfillmentType === "delivery" && (
              <div className="mt-4 space-y-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Datos para delivery
                  </p>
                  <p className="mt-1 text-xs font-bold text-zinc-600">
                    Ingresa calle, número y comuna para cotizar el despacho con Uber Direct.
                  </p>
                </div>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Dirección de entrega
                  </span>
                  <input
                    value={deliveryAddress}
                    onChange={(event) => {
                      setDeliveryAddress(event.target.value);
                      setDeliveryQuote(null);
                    }}
                    placeholder="Ej: Alemania 3019"
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Comuna de entrega
                  </span>
                  <select
                    value={deliveryCity}
                    onChange={(event) => {
                      setDeliveryCity(event.target.value);
                      setDeliveryQuote(null);
                    }}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  >
                    
                    
                    
                    
                    
                    
                    
                    
                  <option value="Concepción">Concepción</option>
                  </select>
                  <p className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-black text-blue-800">
                    Uber Direct llega hasta 5 km maximo de distancia de nuestro local. Por ahora disponible solo para Concepcion.
                  </p>
                  <p className="mt-2 text-xs font-bold text-zinc-500">
                    Selecciona la comuna correcta para que Uber pueda validar cobertura.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Teléfono de contacto
                  </span>
                  <input
                    value={deliveryPhone}
                    onChange={(event) => {
                      setDeliveryPhone(event.target.value);
                      setDeliveryQuote(null);
                    }}
                    placeholder="Ej: +56912345678"
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Referencia / instrucciones
                  </span>
                  <textarea
                    value={deliveryInstructions}
                    onChange={(event) => {
                      setDeliveryInstructions(event.target.value.slice(0, 250));
                      setDeliveryQuote(null);
                    }}
                    placeholder="Ej: Portón negro, llamar al llegar"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={quoteDelivery}
                  disabled={quotingDelivery || cart.length === 0}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  {quotingDelivery ? "Cotizando delivery..." : "Cotizar delivery"}
                </button>

                {deliveryQuote && (
                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-zinc-600">
                        Delivery Uber
                      </p>
                      <p className="text-xl font-black text-blue-700">
                        {formatPrice(deliveryQuote.fee)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-zinc-500">
                      Esta cotización se sumará al total del pedido.
                    </p>
                  </div>
                )}
              </div>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Medio de pago
              </span>
              <select suppressHydrationWarning
                value={paymentMethod}
                onChange={() => setPaymentMethod("debit_credit")}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="debit_credit">Débito / Crédito</option>
              </select>
            </label>
          </div>

          {couponsVisible && (
          <section className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Cupón de descuento
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-600">
                Solo disponible para pagos online con débito o crédito.
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <input suppressHydrationWarning
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase());
                  if (appliedCoupon) {
                    setAppliedCoupon(null);
                  }
                }}
                placeholder="Ej: UWA10"
                className="min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black uppercase outline-none focus:border-[#10B557]"
              />

              {appliedCoupon ? (
                <button suppressHydrationWarning
                  type="button"
                  onClick={clearCoupon}
                  className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
                >
                  Quitar
                </button>
              ) : (
                <button suppressHydrationWarning
                  type="button"
                  onClick={applyCoupon}
                  disabled={validatingCoupon || cart.length === 0}
                  className="rounded-2xl bg-[#10B557] px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  {validatingCoupon ? "Validando..." : "Aplicar"}
                </button>
              )}
            </div>

            {couponMessage && (
              <p
                className={`mt-3 rounded-2xl p-3 text-xs font-black ${
                  appliedCoupon
                    ? "bg-white text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {couponMessage}
              </p>
            )}
          </section>
          )}

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

            {couponDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-zinc-500">
                  Descuento {appliedCoupon?.code}
                </p>
                <p className="text-lg font-black text-red-600">
                  - {formatPrice(couponDiscountAmount)}
                </p>
              </div>
            )}

            {deliveryFee > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-zinc-500">Despacho Uber</p>
                <p className="text-lg font-black text-blue-700">
                  + {formatPrice(deliveryFee)}
                </p>
              </div>
            )}

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

          <button suppressHydrationWarning
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

      {orderHistoryVisible && loggedCustomer && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Historial de pedidos
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {loggedCustomer.name}
                </h2>

                <p className="mt-1 text-sm font-bold text-zinc-500">
                  {loggedCustomer.email}
                </p>
              </div>

              <button suppressHydrationWarning
                type="button"
                onClick={() => setOrderHistoryVisible(false)}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            {orderHistoryLoading ? (
              <div className="rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
                Cargando pedidos...
              </div>
            ) : orderHistoryOrders.length === 0 ? (
              <div className="rounded-3xl bg-zinc-50 p-8 text-center">
                <p className="text-xl font-black">Aún no tienes pedidos.</p>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Cuando compres con tu cuenta, aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orderHistoryOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                          Pedido
                        </p>

                        <h3 className="mt-1 text-3xl font-black text-[#10B557]">
                          #{String(order.orderNumber).padStart(3, "0")}
                        </h3>

                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-700">
                          {formatOrderStatus(order.status)}
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">
                          {formatOrderSource(order.orderSource)}
                        </span>

                        <span className="rounded-full bg-purple-100 px-3 py-2 text-xs font-black text-purple-700">
                          {formatFulfillment(order.fulfillmentType)}
                        </span>
                      </div>
                    </div>

                    {order.scheduledFor && (
                      <p className="mt-3 rounded-2xl bg-purple-50 p-3 text-sm font-black text-purple-700">
                        Programado para: {formatDateTime(order.scheduledFor)}
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Total pagado
                        </p>
                        <p className="mt-1 text-2xl font-black text-[#10B557]">
                          {formatPrice(order.total)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Billetera
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {formatPrice(order.walletAmountUsed)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Cashback
                        </p>
                        <p className="mt-1 text-2xl font-black text-[#10B557]">
                          {formatPrice(order.cashbackEarned)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Pago
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatPaymentMethod(order.paymentMethod)}
                        </p>
                      </div>
                    </div>

                    {(order.discountCouponCode || order.discountAmount > 0 || order.tipAmount > 0) && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-red-50 p-4">
                          <p className="text-xs font-black uppercase text-red-600">
                            Cupón
                          </p>
                          <p className="mt-1 text-sm font-black text-red-600">
                            {order.discountCouponCode
                              ? `${order.discountCouponCode} · ${formatPrice(order.discountAmount)} (${order.discountPercent}%)`
                              : "Sin cupón"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-zinc-50 p-4">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Propina
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {formatPrice(order.tipAmount)}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.customerComment && (
                      <div className="mt-3 rounded-2xl bg-yellow-50 p-4">
                        <p className="text-xs font-black uppercase text-yellow-700">
                          Comentario cocina
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-700">
                          {order.customerComment}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 rounded-3xl border border-zinc-200">
                      {order.items.map((item) => (
                        <div key={item.id} className="border-b border-zinc-100 p-4 last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-black">
                              {item.quantity}x {item.productName}
                            </p>

                            <p className="text-lg font-black text-[#10B557]">
                              {formatPrice(item.total)}
                            </p>
                          </div>

                          {item.modifiers.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.modifiers.map((modifier) => (
                                <span
                                  key={modifier.id}
                                  className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-600"
                                >
                                  {modifier.groupName}: {modifier.optionName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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

              <button suppressHydrationWarning
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
                          <button suppressHydrationWarning
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
                              {isSelected ? "\u2713" : ""}
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

                <textarea suppressHydrationWarning
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

            <button suppressHydrationWarning
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



























