"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OrderModifier = {
  id: number;
  price: number;
  option: {
    id: number;
    name: string;
    price: number;
    template?: {
      id: number;
      name: string;
    };
  };
};

type OrderItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    id: number;
    name: string;
  };
  modifiers: OrderModifier[];
};

type Order = {
  id: number;
  orderNumber: number;
  status: string;
  total: number;
  customerName: string | null;
  customerComment: string | null;
  customerId?: number | null;
  companyCustomerId?: number | null;
  orderSource?: string;
  fulfillmentType?: string;
  scheduledFor?: string | null;
  totemCode: string | null;
  paymentMethod?: string;
  printStatus?: string | null;
  printedAt?: string | null;
  printCount?: number | null;
  lastPrintError?: string | null;
  createdAt: string;
  items: OrderItem[];
};

type BoardKey =
  | "action"
  | "company"
  | "printError"
  | "scheduled"
  | "printed"
  | "all";

type DateFilter = "today" | "yesterday" | "tomorrow" | "all";
type ChannelFilter = "all" | "totem" | "online" | "company" | "delivery";

const CHILE_TIME_ZONE = "America/Santiago";

function cleanUberComment(value: string | null | undefined) {
  let text = String(value || "");

  const garbageIndex = text.search(/CÃ|Ãƒ|Ã‚|Â/);
  if (garbageIndex >= 0) text = text.slice(0, garbageIndex).trim();

  return text.replace(/\s+\|\s*$/, "").trim();
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-CL", {
    timeZone: CHILE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    timeZone: CHILE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleString("es-CL", {
    timeZone: CHILE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getChileDateKey(value: string | Date) {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: CHILE_TIME_ZONE,
  });
}

function getChileDateKeyOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return getChileDateKey(date);
}

function normalizeSearchText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(text: string) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function groupModifiers(modifiers: OrderModifier[]) {
  const grouped: Record<string, string[]> = {};

  modifiers.forEach((modifier) => {
    const groupName = modifier.option.template?.name || "Modificador";

    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }

    grouped[groupName].push(modifier.option.name);
  });

  return grouped;
}

function isOnlineOrder(order: Order) {
  return order.orderSource === "online" || order.totemCode === "online";
}

function isCompanyOrder(order: Order) {
  return order.orderSource === "company" || order.paymentMethod === "bank_transfer";
}

function isDeliveryOrder(order: Order) {
  const source = normalizeSearchText(order.orderSource);
  const totemCode = normalizeSearchText(order.totemCode);
  const comment = normalizeSearchText(order.customerComment);
  const paymentMethod = normalizeSearchText(order.paymentMethod);

  return (
    source.includes("uber") ||
    source.includes("delivery") ||
    totemCode.includes("uber") ||
    totemCode.includes("delivery") ||
    comment.includes("delivery uber") ||
    comment.includes("uber direct") ||
    comment.includes("tracking:") ||
    paymentMethod.includes("uber")
  );
}

function getOrderSourceLabel(order: Order) {
  if (isCompanyOrder(order)) return "PEDIDO EMPRESA";
  if (isDeliveryOrder(order)) return "DELIVERY / UBER";
  if (isOnlineOrder(order)) return "PEDIDO ONLINE";
  return "PEDIDO TÓTEM";
}

function getFulfillmentLabel(order: Order) {
  if (order.fulfillmentType === "scheduled") return "PROGRAMADO";
  return "RETIRO AHORA";
}

function isPrintedOrReady(order: Order) {
  return order.status === "ready" || order.printStatus === "printed";
}

function isPrintError(order: Order) {
  return order.printStatus === "error";
}

function isPendingTooLong(order: Order) {
  if (order.status !== "pending") return false;
  if (isCompanyOrder(order)) return false;
  if (isPrintedOrReady(order)) return false;

  const createdAt = new Date(order.createdAt).getTime();
  const ageMs = Date.now() - createdAt;

  return ageMs > 2 * 60 * 1000;
}

function isScheduledSoon(order: Order) {
  if (order.fulfillmentType !== "scheduled" || !order.scheduledFor) return false;
  if (isPrintedOrReady(order)) return false;

  const scheduledAt = new Date(order.scheduledFor).getTime();
  const diffMs = scheduledAt - Date.now();

  return diffMs <= 60 * 60 * 1000 && diffMs >= -15 * 60 * 1000;
}

function requiresImmediateAction(order: Order) {
  if (order.status !== "pending") return false;

  return (
    isCompanyOrder(order) ||
    isPrintError(order) ||
    isPendingTooLong(order) ||
    isScheduledSoon(order)
  );
}

function getCardStyle(order: Order) {
  if (requiresImmediateAction(order)) {
    return "border-orange-500 bg-orange-50 shadow-orange-100";
  }

  if (isPrintedOrReady(order)) {
    return "border-zinc-200 bg-white opacity-80";
  }

  if (isOnlineOrder(order)) {
    return "border-blue-300 bg-white";
  }

  return "border-[#10B557] bg-white";
}

function printOrderTicket(order: Order) {
  const itemsHtml = order.items
    .map((item) => {
      const groupedModifiers = groupModifiers(item.modifiers);

      const modifiersHtml = Object.entries(groupedModifiers)
        .map(
          ([groupName, options]) => `
            <div class="modifier-group">
              <div class="modifier-title">${escapeHtml(groupName)}</div>
              <div class="modifier-options">${escapeHtml(options.join(", "))}</div>
            </div>
          `
        )
        .join("");

      return `
        <div class="item">
          <div class="item-title">
            ${item.quantity}x ${escapeHtml(item.product.name)}
          </div>
          ${modifiersHtml}
        </div>
      `;
    })
    .join("");

  const sourceLabel = getOrderSourceLabel(order);
  const fulfillmentLabel = getFulfillmentLabel(order);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Comanda Pedido #${order.orderNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            font-family: Arial, Helvetica, sans-serif;
          }

          .ticket {
            width: 80mm;
            padding: 4mm;
          }

          .center {
            text-align: center;
          }

          .brand {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
          }

          .source {
            margin-top: 6px;
            padding: 5px;
            border: 2px solid black;
            font-size: 16px;
            font-weight: 900;
            text-align: center;
          }

          .title {
            margin-top: 6px;
            font-size: 28px;
            font-weight: 900;
          }

          .meta {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 700;
          }

          .client {
            margin-top: 6px;
            font-size: 18px;
            font-weight: 900;
          }

          .line {
            border-top: 1px dashed black;
            margin: 10px 0;
          }

          .item {
            margin-bottom: 12px;
          }

          .item-title {
            font-size: 19px;
            font-weight: 900;
            line-height: 1.2;
          }

          .modifier-group {
            margin-top: 7px;
            padding-left: 4px;
          }

          .modifier-title {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .modifier-options {
            margin-top: 2px;
            font-size: 17px;
            font-weight: 800;
            line-height: 1.25;
          }

          .comment-box {
            margin: 10px 0;
            padding: 8px;
            border: 2px solid black;
            font-size: 15px;
            font-weight: 900;
            line-height: 1.25;
          }

          .comment-title {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 3px;
          }

          .total {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 18px;
            font-weight: 900;
          }

          .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
          }

          @media print {
            body {
              width: 80mm;
            }

            .ticket {
              width: 80mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="ticket">
          <div class="center">
            <div class="brand">ÜWA</div>
            <div class="source">${escapeHtml(sourceLabel)}</div>
            <div class="title">PEDIDO #${String(order.orderNumber).padStart(3, "0")}</div>
            <div class="meta">${formatDate(order.createdAt)} - ${formatTime(order.createdAt)}</div>
            <div class="meta">${escapeHtml(fulfillmentLabel)}</div>
            ${
              order.fulfillmentType === "scheduled" && order.scheduledFor
                ? `<div class="meta">Programado: ${escapeHtml(formatDateTime(order.scheduledFor))}</div>`
                : ""
            }
            ${
              order.customerName
                ? `<div class="client">Cliente: ${escapeHtml(order.customerName)}</div>`
                : ""
            }
          </div>

          <div class="line"></div>

          ${
            order.customerComment
              ? `<div class="comment-box"><div class="comment-title">COMENTARIO COCINA</div>${escapeHtml(cleanUberComment(order.customerComment))}</div><div class="line"></div>`
              : ""
          }

          ${itemsHtml}

          <div class="line"></div>

          <div class="total">
            <span>TOTAL</span>
            <span>${formatPrice(order.total)}</span>
          </div>

          <div class="line"></div>

          <div class="footer">
            Preparar según comanda
          </div>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<BoardKey>("action");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioNeedsTouch, setAudioNeedsTouch] = useState(false);
  const [companyApprovalKeys, setCompanyApprovalKeys] = useState<Record<number, string>>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const firstOrdersLoadRef = useRef(true);
  const knownPendingOrderIdsRef = useRef<Set<number>>(new Set());

  async function loadOrders() {
    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(order: Order, status: string) {
    try {
      setUpdatingOrderId(order.id);

      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: order.id,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "No se pudo actualizar el pedido.");
        return;
      }

      await loadOrders();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar pedido.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function validatePrintAndReady(order: Order) {
    const approvalKey = String(companyApprovalKeys[order.id] || "").trim();

    if (!approvalKey) {
      alert("Ingresa la clave para autorizar este pedido empresa.");
      return;
    }

    const ok = window.confirm(
      "¿Confirmas pago, fecha de entrega y autorización para imprimir este pedido empresa?"
    );

    if (!ok) return;

    try {
      setUpdatingOrderId(order.id);

      const response = await fetch("/api/kitchen/company-order/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          approvalKey,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.error || "No se pudo autorizar el pedido empresa.");
        return;
      }

      printOrderTicket(order);

      setCompanyApprovalKeys((current) => ({
        ...current,
        [order.id]: "",
      }));

      await loadOrders();
    } catch (error) {
      console.error(error);
      alert("Error al autorizar pedido empresa.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function getAudioContext() {
    if (typeof window === "undefined") return null;

    const AudioContextConstructor =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextConstructor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    return audioContextRef.current;
  }

  async function enableKitchenSound() {
    const audioContext = getAudioContext();

    if (!audioContext) {
      alert("Este navegador no permite activar sonido.");
      return;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    localStorage.setItem("kitchenSoundEnabled", "true");
    setSoundEnabled(true);
    setAudioNeedsTouch(false);
    playNewOrderSound(true);
  }

  function playNewOrderSound(force = false) {
    if (!force && !soundEnabled) return;

    const audioContext = getAudioContext();

    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      setAudioNeedsTouch(true);
      return;
    }

    const now = audioContext.currentTime;

    const tones = [
      1800, 850,
      1800, 850,
      2100, 950,
      2100, 950,
      1800, 850,
      1800, 850,
    ];

    tones.forEach((frequency, index) => {
      const startTime = now + index * 0.14;

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.9, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.12);
    });
  }

  useEffect(() => {
    loadOrders();

    const rememberedSound = localStorage.getItem("kitchenSoundEnabled");

    if (rememberedSound === "true") {
      setSoundEnabled(true);
      setAudioNeedsTouch(true);
    }

    const interval = window.setInterval(() => {
      loadOrders();
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const pendingOrderIds = new Set(
      orders
        .filter((order) => order.status === "pending")
        .map((order) => order.id)
    );

    if (firstOrdersLoadRef.current) {
      knownPendingOrderIdsRef.current = pendingOrderIds;
      firstOrdersLoadRef.current = false;
      return;
    }

    const hasNewPendingOrder = Array.from(pendingOrderIds).some(
      (orderId) => !knownPendingOrderIdsRef.current.has(orderId)
    );

    knownPendingOrderIdsRef.current = pendingOrderIds;

    if (hasNewPendingOrder) {
      playNewOrderSound();
    }
  }, [orders, soundEnabled]);

  const filteredOrders = useMemo(() => {
    const cleanTextSearch = normalizeSearchText(orderSearch);
    const cleanOrderNumberSearch = orderSearch.replace(/\D/g, "");
    const targetDate =
      dateFilter === "today"
        ? getChileDateKeyOffset(0)
        : dateFilter === "yesterday"
        ? getChileDateKeyOffset(-1)
        : dateFilter === "tomorrow"
        ? getChileDateKeyOffset(1)
        : "";

    return orders.filter((order) => {
      const rawOrderNumber = String(order.orderNumber);
      const paddedOrderNumber = String(order.orderNumber).padStart(3, "0");
      const customerName = normalizeSearchText(order.customerName);

      const matchesSearch =
        !cleanTextSearch && !cleanOrderNumberSearch
          ? true
          : (cleanOrderNumberSearch.length > 0 &&
              (rawOrderNumber.includes(cleanOrderNumberSearch) ||
                paddedOrderNumber.includes(cleanOrderNumberSearch))) ||
            (cleanTextSearch.length > 0 && customerName.includes(cleanTextSearch));

      const matchesDate =
        dateFilter === "all" ? true : getChileDateKey(order.createdAt) === targetDate;

      const matchesChannel =
        channelFilter === "all"
          ? true
          : channelFilter === "totem"
          ? !isOnlineOrder(order) && !isCompanyOrder(order) && !isDeliveryOrder(order)
          : channelFilter === "online"
          ? isOnlineOrder(order)
          : channelFilter === "company"
          ? isCompanyOrder(order)
          : isDeliveryOrder(order);

      return matchesSearch && matchesDate && matchesChannel;
    });
  }, [orders, orderSearch, dateFilter, channelFilter]);

  const actionOrders = filteredOrders.filter(requiresImmediateAction);
  const companyOrders = filteredOrders.filter(isCompanyOrder);
  const printErrorOrders = filteredOrders.filter(isPrintError);
  const scheduledOrders = filteredOrders.filter(
    (order) => order.fulfillmentType === "scheduled"
  );
  const printedOrders = filteredOrders.filter(isPrintedOrReady);

  const pendingOrders = filteredOrders.filter((order) => order.status === "pending");
  const readyOrders = filteredOrders.filter(isPrintedOrReady);

  const activeOrders =
    selectedBoard === "action"
      ? actionOrders
      : selectedBoard === "company"
      ? companyOrders
      : selectedBoard === "printError"
      ? printErrorOrders
      : selectedBoard === "scheduled"
      ? scheduledOrders
      : selectedBoard === "printed"
      ? printedOrders
      : filteredOrders;

  const boardItems: {
    key: BoardKey;
    label: string;
    count: number;
    urgent?: boolean;
    helper: string;
  }[] = [
    {
      key: "action",
      label: "Acción inmediata",
      count: actionOrders.length,
      urgent: actionOrders.length > 0,
      helper: "Requiere revisión ahora",
    },
    {
      key: "company",
      label: "Empresas",
      count: companyOrders.length,
      urgent: companyOrders.some((order) => order.status === "pending"),
      helper: "Validar pago y fecha",
    },
    {
      key: "printError",
      label: "Error impresión",
      count: printErrorOrders.length,
      urgent: printErrorOrders.length > 0,
      helper: "Revisar impresora/agente",
    },
    {
      key: "scheduled",
      label: "Programados",
      count: scheduledOrders.length,
      urgent: scheduledOrders.some(isScheduledSoon),
      helper: "Pedidos con horario",
    },
    {
      key: "printed",
      label: "Impresos/Listos",
      count: printedOrders.length,
      helper: "Historial rápido",
    },
    {
      key: "all",
      label: "Todos",
      count: filteredOrders.length,
      helper: "Vista completa",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-100 p-4 text-zinc-900 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            Cocina ÜWA
          </p>
          <h1 className="mt-2 text-4xl font-black">Pedidos en cocina</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/admin"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-bold"
          >
            Volver
          </a>

          <button
            type="button"
            onClick={enableKitchenSound}
            className={`rounded-2xl px-5 py-4 text-sm font-black shadow-sm ${
              soundEnabled
                ? "bg-green-100 text-green-700"
                : "bg-zinc-950 text-white"
            }`}
          >
            {soundEnabled ? "Sonido activo" : "Activar sonido"}
          </button>
        </div>
      </header>

      {audioNeedsTouch && soundEnabled && (
        <button
          type="button"
          onClick={enableKitchenSound}
          className="mb-6 w-full animate-pulse rounded-3xl border-4 border-orange-400 bg-orange-500 p-5 text-center text-xl font-black text-white shadow-lg"
        >
          Toca aquí para reactivar la alarma de cocina
        </button>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Acción inmediata
          </p>
          <h2 className="mt-2 text-4xl font-black text-orange-500">
            {actionOrders.length}
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Pendientes
          </p>
          <h2 className="mt-2 text-4xl font-black text-[#10B557]">
            {pendingOrders.length}
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Listos/impresos
          </p>
          <h2 className="mt-2 text-4xl font-black">{readyOrders.length}</h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Pedidos filtrados
          </p>
          <h2 className="mt-2 text-4xl font-black">{filteredOrders.length}</h2>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px]">
          <div>
            <h2 className="text-xl font-black">Buscar pedido</h2>
            <p className="mb-3 text-sm font-bold text-zinc-500">
              Busca por número de orden o nombre del cliente.
            </p>

            <input
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Buscar pedido # o nombre..."
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-lg font-black outline-none focus:border-[#10B557]"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-black uppercase text-zinc-500">
              Fecha
            </p>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-base font-black outline-none focus:border-[#10B557]"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="tomorrow">Mañana</option>
              <option value="all">Todas</option>
            </select>
          </div>

          <div>
            <p className="mb-3 text-sm font-black uppercase text-zinc-500">
              Canal
            </p>
            <select
              value={channelFilter}
              onChange={(event) =>
                setChannelFilter(event.target.value as ChannelFilter)
              }
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-base font-black outline-none focus:border-[#10B557]"
            >
              <option value="all">Todos</option>
              <option value="totem">Tótem</option>
              <option value="online">Online</option>
              <option value="company">Empresa</option>
              <option value="delivery">Delivery/Uber</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">
                {boardItems.find((item) => item.key === selectedBoard)?.label}
              </h2>
              <p className="text-sm font-bold text-zinc-500">
                {boardItems.find((item) => item.key === selectedBoard)?.helper}
              </p>
            </div>

            {orderSearch && (
              <button
                type="button"
                onClick={() => setOrderSearch("")}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-black text-white"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-xl font-black">Cargando pedidos...</p>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-2xl font-black">No hay pedidos en esta categoría</p>
              <p className="mt-2 text-zinc-500">
                Cambia el filtro o revisa otra pizarra de la barra derecha.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {activeOrders.map((order) => {
                const urgent = requiresImmediateAction(order);

                return (
                  <article
                    key={order.id}
                    className={`rounded-3xl border-2 p-5 shadow-sm ${getCardStyle(order)} ${
                      urgent ? "animate-pulse" : ""
                    }`}
                  >
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-3xl font-black">
                            Pedido #{String(order.orderNumber).padStart(3, "0")}
                          </h3>

                          {urgent && (
                            <span className="animate-bounce rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase text-white">
                              Acción ahora
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          Hora: {formatTime(order.createdAt)} · {formatDate(order.createdAt)}
                        </p>

                        <p className="mt-1 text-sm font-black text-zinc-700">
                          Cliente: {order.customerName || "Sin nombre"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
                              isCompanyOrder(order)
                                ? "bg-orange-500 text-white"
                                : isOnlineOrder(order)
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {getOrderSourceLabel(order)}
                          </span>

                          <span className="rounded-full bg-purple-100 px-4 py-2 text-xs font-black uppercase text-purple-700">
                            {getFulfillmentLabel(order)}
                          </span>

                          {order.fulfillmentType === "scheduled" && order.scheduledFor && (
                            <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-black uppercase text-yellow-700">
                              {formatDateTime(order.scheduledFor)}
                            </span>
                          )}

                          {order.printStatus && (
                            <span
                              className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
                                order.printStatus === "error"
                                  ? "bg-red-100 text-red-700"
                                  : order.printStatus === "printed"
                                  ? "bg-zinc-900 text-white"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              Impresión: {order.printStatus}
                            </span>
                          )}
                        </div>

                        {order.customerComment && (
                          <div className="mt-3 rounded-2xl bg-yellow-50 p-4">
                            <p className="text-xs font-black uppercase text-yellow-700">
                              Comentario cocina
                            </p>
                            <p className="mt-1 text-base font-black text-zinc-800">
                              {cleanUberComment(order.customerComment)}
                            </p>
                          </div>
                        )}

                        {order.lastPrintError && (
                          <div className="mt-3 rounded-2xl bg-red-50 p-4">
                            <p className="text-xs font-black uppercase text-red-700">
                              Error impresión
                            </p>
                            <p className="mt-1 text-sm font-black text-red-800">
                              {order.lastPrintError}
                            </p>
                          </div>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-black ${
                          isPrintedOrReady(order)
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isPrintedOrReady(order) ? "Listo" : "Pendiente"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const groupedModifiers = groupModifiers(item.modifiers);

                        return (
                          <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                            <h4 className="text-xl font-black">
                              {item.quantity}x {item.product.name}
                            </h4>

                            {Object.entries(groupedModifiers).length > 0 && (
                              <div className="mt-4 space-y-3">
                                {Object.entries(groupedModifiers).map(
                                  ([groupName, options]) => (
                                    <div key={groupName}>
                                      <p className="text-xs font-black uppercase text-zinc-400">
                                        {groupName}
                                      </p>
                                      <p className="text-lg font-bold">
                                        {options.join(", ")}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-5">
                      <p className="text-2xl font-black text-[#10B557]">
                        {formatPrice(order.total)}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {isCompanyOrder(order) && order.status === "pending" ? (
                          <>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={companyApprovalKeys[order.id] || ""}
                              onChange={(event) =>
                                setCompanyApprovalKeys((current) => ({
                                  ...current,
                                  [order.id]: event.target.value,
                                }))
                              }
                              placeholder="Clave autorización"
                              className="min-w-[220px] rounded-2xl border-2 border-orange-300 bg-white px-5 py-4 text-base font-black outline-none focus:border-orange-500"
                            />

                            <button
                              onClick={() => validatePrintAndReady(order)}
                              disabled={updatingOrderId === order.id}
                              className="rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white disabled:bg-zinc-300"
                            >
                              {updatingOrderId === order.id
                                ? "Validando..."
                                : "Validar con clave, imprimir y dejar listo"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => printOrderTicket(order)}
                              className="rounded-2xl bg-zinc-900 px-5 py-4 text-base font-black text-white"
                            >
                              Reimprimir
                            </button>

                            {order.status === "pending" && (
                              <button
                                onClick={() => updateOrderStatus(order, "ready")}
                                disabled={updatingOrderId === order.id}
                                className="rounded-2xl bg-[#10B557] px-5 py-4 text-base font-black text-white disabled:bg-zinc-300"
                              >
                                {updatingOrderId === order.id
                                  ? "Actualizando..."
                                  : "Marcar listo"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="xl:sticky xl:top-6 xl:h-fit">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-xl font-black">Pizarras</h2>
            <p className="mb-4 text-sm font-bold text-zinc-500">
              Lo naranjo requiere acción inmediata.
            </p>

            <div className="space-y-3">
              {boardItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedBoard(item.key)}
                  className={`relative w-full rounded-2xl border-2 p-4 text-left transition ${
                    selectedBoard === item.key
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : item.urgent
                      ? "animate-pulse border-orange-400 bg-orange-50 text-zinc-950"
                      : "border-zinc-200 bg-white text-zinc-950"
                  }`}
                >
                  {item.urgent && (
                    <span className="absolute -right-2 -top-2 flex h-8 min-w-8 animate-bounce items-center justify-center rounded-full bg-orange-500 px-2 text-sm font-black text-white shadow-lg">
                      {item.count}
                    </span>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-black">{item.label}</p>
                      <p
                        className={`text-xs font-bold ${
                          selectedBoard === item.key ? "text-zinc-300" : "text-zinc-500"
                        }`}
                      >
                        {item.helper}
                      </p>
                    </div>

                    {!item.urgent && (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-black text-zinc-700">
                        {item.count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}



