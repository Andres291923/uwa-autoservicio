"use client";

import TotemCompanyWorkerSessionBadge from "./TotemCompanyWorkerSessionBadge";

import { useEffect, useMemo, useState } from "react";
import TotemCompanyWorkerLoginButton from "./TotemCompanyWorkerLoginButton";

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
  customerComment: string;
};

type TotemStep = "catalog" | "summary" | "customer" | "payment";

type PaymentMethod = "debit_credit" | "food_benefit";

type WorkerTotemSession = {
  accountType: "company_worker_totem";
  workerId: number;
  companyCustomerId: number;
  workerName: string;
  workerEmail: string | null;
  workerRut: string | null;
  walletBalance: number;
  companyName: string;
  companyEmail: string;
};

type StoreStatus = {
  isOpen: boolean;
  message: string;
  currentTime?: string;
  schedule?: {
    openTime?: string;
    closeTime?: string;
  } | null;
};

type IdentifiedTotemCustomer = {
  id: number;
  name: string;
  email: string;
  walletBalance: number;
  manualBalance?: number;
  cashbackBalance?: number;
  expiredCashback?: number;
  cashbackCredits?: number;
  nextCashbackExpiration?: string | null;
  nextCashbackAmount?: number;
};

type TotemAuthMode = "login" | "register" | "setup";

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

function formatShortDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL");
}

function getActiveModifierGroups(product: Product | null) {
  if (!product) return [];

  return product.modifierGroups
    .filter((group) => group.active && group.template.active)
    .filter((group) => !group.channelVisibility || group.channelVisibility === "all" || group.channelVisibility === "totem")
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
  const [selectedProductComment, setSelectedProductComment] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [tipSelected, setTipSelected] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [closedModalVisible, setClosedModalVisible] = useState(false);

  const [identifiedCustomer, setIdentifiedCustomer] =
      useState<IdentifiedTotemCustomer | null>(null);

    const [companyWorkerSession, setCompanyWorkerSession] =
      useState<WorkerTotemSession | null>(null);
  const [totemAuthVisible, setTotemAuthVisible] = useState(false);
  const [totemAuthMode, setTotemAuthMode] = useState<TotemAuthMode>("login");
  const [totemAuthName, setTotemAuthName] = useState("");
  const [totemAuthEmail, setTotemAuthEmail] = useState("");
  const [totemAuthPassword, setTotemAuthPassword] = useState("");
  const [totemAuthPin, setTotemAuthPin] = useState("");
  const [totemAuthPinConfirm, setTotemAuthPinConfirm] = useState("");
  const [totemAuthLoading, setTotemAuthLoading] = useState(false);
  const [totemAuthMessage, setTotemAuthMessage] = useState("");

  const loggedCustomerName = identifiedCustomer?.name || "";


  function openTotemAuth(mode: TotemAuthMode = "login") {
    setTotemAuthMode(mode);
    setTotemAuthMessage("");
    setTotemAuthPin("");
    setTotemAuthPinConfirm("");
    setTotemAuthPassword("");
    setTotemAuthName("");
    setTotemAuthEmail("");
    setTotemAuthPin("");
    setTotemAuthPinConfirm("");
    setTotemAuthVisible(true);
  }

  function closeTotemAuth() {
    setTotemAuthVisible(false);
    setTotemAuthMessage("");
    setTotemAuthName("");
    setTotemAuthEmail("");
    setTotemAuthPassword("");
    setTotemAuthPin("");
    setTotemAuthPinConfirm("");
  }

  function resetIdentifiedCustomer() {
    setIdentifiedCustomer(null);
    setCustomerName("");
  }

  function cleanPin(value: string) {
    return value.replace(/\D/g, "").slice(0, 4);
  }

  async function setIdentifiedCustomerWithWallet(customer: IdentifiedTotemCustomer) {
    try {
      const response = await fetch(
        `/api/customer-wallet/summary?customerId=${customer.id}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        setIdentifiedCustomer(customer);
        return;
      }

      setIdentifiedCustomer({
        ...customer,
        walletBalance: data.totalBalance,
        manualBalance: data.manualBalance,
        cashbackBalance: data.cashbackBalance,
        expiredCashback: data.expiredCashback,
        cashbackCredits: data.cashbackCredits,
        nextCashbackExpiration: data.nextCashbackExpiration,
        nextCashbackAmount: data.nextCashbackAmount,
      });
    } catch (error) {
      console.error(error);
      setIdentifiedCustomer(customer);
    }
  }

  async function submitTotemAuth() {
    try {
      setTotemAuthLoading(true);
      setTotemAuthMessage("");

      const email = totemAuthEmail.trim().toLowerCase();
      const pin = cleanPin(totemAuthPin);
      const pinConfirm = cleanPin(totemAuthPinConfirm);

      if (!email) {
        setTotemAuthMessage("Ingresa tu correo.");
        return;
      }

      if (pin.length !== 4) {
        setTotemAuthMessage("El PIN debe tener 4 digitos.");
        return;
      }

      let endpoint = "/api/totem-auth/pin-login";
      let payload: Record<string, unknown> = {
        email,
        pin,
      };

      if (totemAuthMode === "register") {
        if (!totemAuthName.trim()) {
          setTotemAuthMessage("Ingresa tu nombre.");
          return;
        }

        if (pin !== pinConfirm) {
          setTotemAuthMessage("Los PIN no coinciden.");
          return;
        }

        endpoint = "/api/totem-auth/register-pin";
        payload = {
          name: totemAuthName.trim(),
          email,
          pin,
        };
      }

      if (totemAuthMode === "setup") {
        if (!totemAuthPassword.trim()) {
          setTotemAuthMessage("Ingresa tu clave online.");
          return;
        }

        if (pin !== pinConfirm) {
          setTotemAuthMessage("Los PIN no coinciden.");
          return;
        }

        endpoint = "/api/totem-auth/setup-pin";
        payload = {
          email,
          password: totemAuthPassword,
          pin,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setTotemAuthMessage(data.error || "No se pudo ingresar.");

        if (data.needsPinSetup) {
          setTotemAuthMode("setup");
          setTotemAuthPin("");
          setTotemAuthPinConfirm("");
        }

        return;
      }

      if (!data.customer) {
        setTotemAuthMessage("No se recibio informacion del cliente.");
        return;
      }

      await setIdentifiedCustomerWithWallet(data.customer);
      setCustomerName(data.customer.name || "");
      setTotemAuthVisible(false);
      setTotemAuthMessage("");
      setTotemAuthPin("");
      setTotemAuthPinConfirm("");
      setTotemAuthPassword("");
    } catch (error) {
      console.error(error);
      setTotemAuthMessage("Error al identificar cliente.");
    } finally {
      setTotemAuthLoading(false);
    }
  }

  async function loadStoreStatus() {
    try {
      const response = await fetch("/api/store-status", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        setStoreStatus(data);
      }
    } catch (error) {
      console.error(error);
    }
  }
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

  const walletBalance = identifiedCustomer?.walletBalance || 0;
  const manualBalance = identifiedCustomer?.manualBalance || 0;
  const cashbackBalance = identifiedCustomer?.cashbackBalance || 0;
  const expiredCashback = identifiedCustomer?.expiredCashback || 0;
  const nextCashbackExpiration = identifiedCustomer?.nextCashbackExpiration || null;
  const walletAmountToUse =
    identifiedCustomer && useWalletBalance
      ? Math.min(finalTotal, walletBalance)
      : 0;
  const amountToPay = Math.max(0, finalTotal - walletAmountToUse);

  function openProduct(product: Product) {
    setOrderMessage("");

    const groups = getActiveModifierGroups(product);

    if (groups.length === 0) {
      addSimpleProductToCart(product);
      return;
    }

    setSelectedProduct(product);
    setSelectedOptionsByGroup({});
    setSelectedProductComment("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeProductBuilder() {
    setSelectedProduct(null);
    setSelectedOptionsByGroup({});
    setSelectedProductComment("");
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
        customerComment: "",
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
        customerComment: selectedProductComment.trim(),
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
    setUseWalletBalance(false);
    setIdentifiedCustomer(null);
    setStep("catalog");
  }

  function goToSummary() {
    if (cart.length === 0) return;

    if (storeStatus && !storeStatus.isOpen) {
      setClosedModalVisible(true);
      return;
    }

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

  function buildOrderCustomerComment() {
    return cart
      .filter((item) => item.customerComment.trim())
      .map((item) => `${item.name}: ${item.customerComment.trim()}`)
      .join(" | ");
  }

  function goToPaymentStep() {
    if (cart.length === 0) return;

    const finalCustomerName = companyWorkerSession
      ? companyWorkerSession.companyName
      : (loggedCustomerName || customerName).trim();

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

    const finalCustomerName = companyWorkerSession
      ? companyWorkerSession.companyName
      : (loggedCustomerName || customerName).trim();

    if (!finalCustomerName) {
      setCustomerMessage("Debes ingresar el nombre del cliente.");
      return;
    }

    if (!companyWorkerSession && amountToPay > 0 && !selectedPaymentMethod) {
      setCustomerMessage("Debes seleccionar un medio de pago.");
      return;
    }

    if (companyWorkerSession && amountToPay > companyWorkerSession.walletBalance) {
      setCustomerMessage("Saldo trabajador insuficiente para este pedido.");
      return;
    }

    const baseCustomerComment = buildOrderCustomerComment();

    const customerComment = companyWorkerSession
      ? [
          "TRABAJADOR EMPRESA",
          "Empresa: " + companyWorkerSession.companyName,
          "Trabajador: " + companyWorkerSession.workerName,
          baseCustomerComment,
        ]
          .filter(Boolean)
          .join(" | ")
      : baseCustomerComment;

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
            customerId: companyWorkerSession ? null : identifiedCustomer?.id || null,
            companyCustomerId: companyWorkerSession?.companyCustomerId || null,
            companyWorkerId: companyWorkerSession?.workerId || null,
            customerComment,
          totemCode: "totem-local",
          paymentMethod: companyWorkerSession
              ? "worker_wallet"
              : amountToPay === 0
              ? "wallet"
              : selectedPaymentMethod,
          walletAmountUsed: companyWorkerSession ? amountToPay : walletAmountToUse,
          tipAmount,
          orderSource: companyWorkerSession ? "company_worker_totem" : "totem",
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
    setUseWalletBalance(false);
    setIdentifiedCustomer(null);
    setStep("catalog");
      if (companyWorkerSession) {
          try {
            const balanceResponse = await fetch("/api/company-worker-auth/balance", {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                workerId: companyWorkerSession.workerId,
              }),
            });

            const balanceData = await balanceResponse.json();

            if (balanceResponse.ok) {
              const updatedSession = {
                ...companyWorkerSession,
                walletBalance: Number(balanceData.walletBalance || 0),
              };

              setCompanyWorkerSession(updatedSession);

              window.localStorage.setItem(
                "totem_company_worker_session",
                JSON.stringify(updatedSession)
              );

              window.dispatchEvent(
                new CustomEvent("totem-company-worker-update", {
                  detail: updatedSession,
                })
              );
            }
          } catch (error) {
            console.error(error);
          }
        }

        // UPDATE_COMPANY_WORKER_BALANCE_AFTER_ORDER
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
    // LOAD_COMPANY_WORKER_TOTEM_SESSION
    function loadCompanyWorkerSession() {
      const saved = window.localStorage.getItem("totem_company_worker_session");

      if (!saved) {
        setCompanyWorkerSession(null);
        return;
      }

      try {
        setCompanyWorkerSession(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("totem_company_worker_session");
        setCompanyWorkerSession(null);
      }
    }

    function handleCompanyWorkerLogin(event: Event) {
      const customEvent = event as CustomEvent<WorkerTotemSession>;
      setCompanyWorkerSession(customEvent.detail);
      setIdentifiedCustomer(null);
      setUseWalletBalance(false);
      setCustomerName(customEvent.detail.workerName || "");
      setCustomerMessage("");
    }

    function handleCompanyWorkerLogout() {
      setCompanyWorkerSession(null);
    }

    loadCompanyWorkerSession();

    window.addEventListener("totem-company-worker-login", handleCompanyWorkerLogin);
    window.addEventListener("totem-company-worker-update", handleCompanyWorkerLogin);
    window.addEventListener("totem-company-worker-logout", handleCompanyWorkerLogout);

    return () => {
      window.removeEventListener("totem-company-worker-login", handleCompanyWorkerLogin);
      window.removeEventListener("totem-company-worker-update", handleCompanyWorkerLogin);
      window.removeEventListener("totem-company-worker-logout", handleCompanyWorkerLogout);
    };
  }, []);

  useEffect(() => {
    if (!identifiedCustomer || walletBalance <= 0 || finalTotal <= 0) {
      setUseWalletBalance(false);
    }
  }, [identifiedCustomer, walletBalance, finalTotal]);

  useEffect(() => {
    loadSettings();
    loadProducts();
    loadStoreStatus();

    const interval = window.setInterval(() => {
      loadStoreStatus();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white pb-[112px] text-zinc-950">

      {/* BADGE_WORKER_ROOT */}
      <TotemCompanyWorkerSessionBadge />
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
          {identifiedCustomer ? (
            <div className="shrink-0">
              <div className="flex h-[44px] min-w-[270px] items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 shadow-sm">
                <div className="min-w-0 text-left">
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-700">
                    Hola, {identifiedCustomer.name}
                  </p>

                  <p className="mt-0.5 text-[14px] font-semibold leading-none text-[#10B557]">
                    {formatPrice(identifiedCustomer.walletBalance)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetIdentifiedCustomer}
                  className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.04em] text-zinc-600 shadow-sm active:scale-[0.98]"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openTotemAuth("login")}
              className="shrink-0 active:scale-[0.98]"
            >
              <div className="flex h-[44px] min-w-[245px] items-center justify-center gap-2 rounded-xl bg-[#10B557] px-4 text-white shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-xs font-semibold">
                  $
                </span>

                <span className="whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.04em]">
                  Ingresa y gana cashback
                </span>
              </div>
            </button>
          )}
        </div>
      </header>

      {orderMessage && (
        <div className="mx-3 mt-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-black text-green-700">
          {orderMessage}
        </div>
      )}
      {totemAuthVisible && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center">
          <div className="my-auto w-full max-w-xl max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Cliente
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Ingresa y gana cashback
                </h2>

                <p className="mt-2 text-sm font-bold text-zinc-500">
                  Usa tu correo y PIN rapido de 4 digitos.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTotemAuth}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTotemAuthMode("login");
                  setTotemAuthMessage("");
                }}
                className={`rounded-2xl px-3 py-3 text-xs font-black ${
                  totemAuthMode === "login"
                    ? "bg-[#10B557] text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Ingresar
              </button>

              <button
                type="button"
                onClick={() => {
                  setTotemAuthMode("register");
                  setTotemAuthMessage("");
                }}
                className={`rounded-2xl px-3 py-3 text-xs font-black ${
                  totemAuthMode === "register"
                    ? "bg-[#10B557] text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Crear cuenta
              </button>

                            <button
                type="button"
                onClick={() => {
                  setTotemAuthMode("setup");
                  setTotemAuthMessage("");
                }}
                className={`rounded-2xl px-3 py-3 text-xs font-black ${
                  totemAuthMode === "setup"
                    ? "bg-[#10B557] text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                <span className="block text-[10px] leading-tight">
                  Si ya tienes cuenta online
                </span>
                <span className="block text-xs font-black leading-tight">
                  Activa PIN
                </span>
              </button>

                  <TotemCompanyWorkerLoginButton />
            </div>

            {totemAuthMode === "register" && (
              <label className="mt-5 block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Nombre
                </span>

                <input autoComplete="off" autoCorrect="off" spellCheck={false}
                  value={totemAuthName}
                  onChange={(event) => setTotemAuthName(event.target.value)}
                  placeholder="Ej: Andres"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-lg font-black outline-none focus:border-[#10B557]"
                />
              </label>
            )}

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Correo
              </span>

              <input autoComplete="off" autoCorrect="off" spellCheck={false} name="totem-email-no-autofill"
                value={totemAuthEmail}
                onChange={(event) => setTotemAuthEmail(event.target.value)}
                placeholder="correo@email.com"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-lg font-black outline-none focus:border-[#10B557]"
              />
            </label>

            {totemAuthMode === "setup" && (
              <label className="mt-4 block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Clave de pedido online
                </span>

                <input autoComplete="new-password" name="totem-password-no-autofill"
                  type="password"
                  value={totemAuthPassword}
                  onChange={(event) => setTotemAuthPassword(event.target.value)}
                  placeholder="Tu clave online"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-lg font-black outline-none focus:border-[#10B557]"
                />
              </label>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                PIN rapido
              </span>

              <input autoComplete="new-password" name="totem-pin-no-autofill"
                inputMode="numeric"
                type="password"
                value={totemAuthPin}
                onChange={(event) => setTotemAuthPin(cleanPin(event.target.value))}
                placeholder="4 digitos"
                maxLength={4}
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-[#10B557]"
              />
            </label>

            {(totemAuthMode === "register" || totemAuthMode === "setup") && (
              <label className="mt-4 block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Confirmar PIN
                </span>

                <input autoComplete="new-password" name="totem-pin-confirm-no-autofill"
                  inputMode="numeric"
                  type="password"
                  value={totemAuthPinConfirm}
                  onChange={(event) =>
                    setTotemAuthPinConfirm(cleanPin(event.target.value))
                  }
                  placeholder="Repite PIN"
                  maxLength={4}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-[#10B557]"
                />
              </label>
            )}

            {totemAuthMessage && (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
                {totemAuthMessage}
              </p>
            )}

            <button
              type="button"
              onClick={submitTotemAuth}
              disabled={totemAuthLoading}
              className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white disabled:bg-zinc-300"
            >
              {totemAuthLoading ? "Ingresando..." : "Continuar"}
            </button>
          </div>
        </div>
      )}
      {closedModalVisible && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
              Tienda cerrada
            </p>

            <h2 className="mt-3 text-3xl font-black">
              No puedes hacer pedidos inmediatos en este horario.
            </h2>

            <p className="mt-3 text-base font-bold text-zinc-500">
              Puedes seguir viendo el catalogo, pero la compra queda bloqueada hasta que el local este abierto.
            </p>

            {storeStatus?.schedule && (
              <p className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm font-black text-zinc-700">
                Horario de hoy: {storeStatus.schedule.openTime} a {storeStatus.schedule.closeTime}
              </p>
            )}

            <button
              type="button"
              onClick={() => setClosedModalVisible(false)}
              className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white"
            >
              Entendido
            </button>
          </div>
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

                    {item.customerComment && (
                      <div className="mt-3 rounded-2xl bg-yellow-50 p-3">
                        <p className="text-xs font-black uppercase text-yellow-700">
                          Comentario cocina
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-700">
                          {item.customerComment}
                        </p>
                      </div>
                    )}

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
              <p className="text-2xl font-black">Total a pagar</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(amountToPay)}
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

            {companyWorkerSession && (
                <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  Pago con saldo empresa activo: {companyWorkerSession.workerName}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between rounded-3xl bg-zinc-100 p-5">
              <p className="text-2xl font-black">Total a pagar</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(amountToPay)}
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

                        {identifiedCustomer && walletBalance > 0 && (
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                      Billetera
                    </p>

                    <h3 className="mt-1 text-2xl font-black">
                      Usar saldo disponible
                    </h3>

                    <p className="mt-1 text-sm font-bold text-zinc-600">
                      Saldo actual: {formatPrice(walletBalance)}
                    </p>
                    <div className="mt-4 grid gap-2">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase text-zinc-500">
                            Saldo recarga
                          </span>
                          <strong className="text-sm font-black">
                            {formatPrice(manualBalance)}
                          </strong>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase text-emerald-700">
                            Cashback disponible
                          </span>
                          <strong className="text-sm font-black text-[#10B557]">
                            {formatPrice(cashbackBalance)}
                          </strong>
                        </div>

                        {nextCashbackExpiration ? (
                          <p className="mt-1 text-xs font-bold text-emerald-700">
                            Próximo vencimiento: {formatShortDate(nextCashbackExpiration)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs font-bold text-zinc-500">
                            Sin cashback vigente por vencer.
                          </p>
                        )}
                      </div>

                      {expiredCashback > 0 && (
                        <div className="rounded-2xl bg-red-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-black uppercase text-red-600">
                              Cashback vencido
                            </span>
                            <strong className="text-sm font-black text-red-600">
                              {formatPrice(expiredCashback)}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseWalletBalance((current) => !current)}
                    className="rounded-2xl px-5 py-4 text-sm font-black text-white"
                    style={{
                      background: useWalletBalance ? settings.primaryColor : "#18181b",
                    }}
                  >
                    {useWalletBalance ? "Saldo aplicado" : "Usar saldo"}
                  </button>
                </div>

                {useWalletBalance && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase text-zinc-400">
                        Compra
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatPrice(finalTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase text-zinc-400">
                        Saldo usado
                      </p>
                      <p className="mt-1 text-xl font-black text-[#10B557]">
                        - {formatPrice(walletAmountToUse)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase text-zinc-400">
                        Pagar restante
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatPrice(amountToPay)}
                      </p>
                    </div>
                  </div>
                )}

                {useWalletBalance && amountToPay === 0 && (
                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-black text-emerald-700">
                    El saldo cubre toda la compra. No necesitas seleccionar tarjeta.
                  </p>
                )}
              </div>
            )}

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
                    {selectedPaymentMethod === "debit_credit" ? "\u2713" : ""}
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
                    {selectedPaymentMethod === "food_benefit" ? "\u2713" : ""}
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
              <p className="text-2xl font-black">Total a pagar</p>

              <p
                className="text-4xl font-black"
                style={{ color: settings.primaryColor }}
              >
                {formatPrice(amountToPay)}
              </p>
            </div>

            <button
              onClick={confirmOrder}
              disabled={(!companyWorkerSession && amountToPay > 0 && !selectedPaymentMethod) || confirmingOrder}
              className="mt-5 w-full rounded-2xl py-5 text-xl font-black text-white disabled:bg-zinc-200 disabled:text-zinc-500"
              style={{
                background:
                  (companyWorkerSession || amountToPay === 0 || selectedPaymentMethod) && !confirmingOrder
                    ? settings.primaryColor
                    : undefined,
              }}
            >
              {confirmingOrder
                  ? "Confirmando pago..."
                  : companyWorkerSession
                  ? "Confirmar con saldo empresa"
                  : amountToPay === 0
                  ? "Confirmar pago con billetera"
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
















