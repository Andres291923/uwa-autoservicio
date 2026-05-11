"use client";

import { useEffect, useRef, useState } from "react";

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
    orderSource?: string;
  fulfillmentType?: string;
  scheduledFor?: string | null;
  totemCode: string | null;
  createdAt: string;
  items: OrderItem[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
  function isOnlineOrder(order: Order) {
  return order.orderSource === "online" || order.totemCode === "online";
}


function getOrderSourceLabel(order: Order) {
  return isOnlineOrder(order) ? "PEDIDO ONLINE" : "PEDIDO TÓTEM";
}

function getFulfillmentLabel(order: Order) {
  if (!isOnlineOrder(order)) return "";

  if (order.fulfillmentType === "scheduled") {
    return "PROGRAMADO";
  }

  return "RETIRO AHORA";
}

function formatScheduledFor(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function isOnlineOrder(order: Order) {
  return order.orderSource === "online" || order.totemCode === "online";
}

function getOrderSourceLabel(order: Order) {
  return isOnlineOrder(order) ? "PEDIDO ONLINE" : "PEDIDO TOTEM";
}

function getFulfillmentLabel(order: Order) {
  if (!isOnlineOrder(order)) return "";

  if (order.fulfillmentType === "scheduled") {
    return "PROGRAMADO";
  }

  return "RETIRO AHORA";
}

function formatScheduledFor(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(text: string) {
  return text
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
            <div class="title">PEDIDO #${String(order.orderNumber).padStart(3, "0")}</div>
            <div class="meta">${formatDate(order.createdAt)} - ${formatTime(order.createdAt)}</div>
            ${
              order.customerName
                ? `<div class="meta">Cliente: ${escapeHtml(order.customerName)}</div>`
                : ""
            }
          </div>

          <div class="line"></div>

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
const [soundEnabled, setSoundEnabled] = useState(false);
const [alarmActive, setAlarmActive] = useState(false);


const audioContextRef = useRef<AudioContext | null>(null);
const firstOrdersLoadRef = useRef(true);
const knownPendingOrderIdsRef = useRef<Set<number>>(new Set());
const alarmIntervalRef = useRef<number | null>(null);
const titleIntervalRef = useRef<number | null>(null);
const originalTitleRef = useRef("Cocina");
  async function loadOrders() {
    try {
      const response = await fetch("/api/orders");
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

  useEffect(() => {
    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const pendingOrders = orders.filter((order) => order.status === "pending");
const readyOrders = orders.filter((order) => order.status === "ready");

const cleanOrderSearch = orderSearch.replace(/\D/g, "");

function orderMatchesSearch(order: Order) {
  if (!cleanOrderSearch) return true;

  const rawOrderNumber = String(order.orderNumber);
  const paddedOrderNumber = String(order.orderNumber).padStart(3, "0");

  return (
    rawOrderNumber.includes(cleanOrderSearch) ||
    paddedOrderNumber.includes(cleanOrderSearch)
  );
}

const filteredPendingOrders = pendingOrders.filter(orderMatchesSearch);
const filteredReadyOrders = readyOrders.filter(orderMatchesSearch);

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

function playNewOrderSound(force = false) {
  if (!force && !soundEnabled) return;

  const audioContext = getAudioContext();

  if (!audioContext) return;

  if (audioContext.state === "suspended") {
    audioContext.resume();
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
async function enableKitchenSound() {
  const audioContext = getAudioContext();

  if (!audioContext) {
    alert("Este navegador no permite activar sonido.");
    return;
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  setSoundEnabled(true);
  playNewOrderSound(true);
}

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
  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            Cocina ÜWA
          </p>
          <h1 className="mt-2 text-4xl font-black">Pedidos en cocina</h1>
        </div>

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
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Pendientes
          </p>
          <h2 className="mt-2 text-4xl font-black text-[#10B557]">
            {pendingOrders.length}
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">Listos</p>
          <h2 className="mt-2 text-4xl font-black">{readyOrders.length}</h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Total pedidos
          </p>
          <h2 className="mt-2 text-4xl font-black">{orders.length}</h2>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-xl font-black">Cargando pedidos...</p>
        </div>
      ) : pendingOrders.length === 0 && readyOrders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-2xl font-black">No hay pedidos todavía</p>
          <p className="mt-2 text-zinc-500">
            Cuando se confirme un pedido desde el tótem aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          <section>
            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-black">Buscar pedido</h2>
      <p className="text-sm font-bold text-zinc-500">
        Busca por numero de orden. Ej: 8, 008, 10 o 010.
      </p>
    </div>

    <div className="flex w-full max-w-md items-center gap-3">
      <input
        value={orderSearch}
        onChange={(event) => setOrderSearch(event.target.value)}
        placeholder="Buscar pedido #..."
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-lg font-black outline-none focus:border-[#10B557]"
      />

      {orderSearch && (
        <button
          type="button"
          onClick={() => setOrderSearch("")}
          className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-black text-white"
        >
          Limpiar
        </button>
      )}
    </div>
  </div>
</section>
            <h2 className="mb-4 text-2xl font-black">Pendientes</h2>

            {pendingOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="font-bold text-zinc-500">
                  No hay pedidos pendientes.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 xl:grid-cols-4">
                {filteredPendingOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-3xl border-2 border-[#10B557] bg-white p-6 shadow-sm"
                  >
      <div className="mb-5 flex items-start justify-between gap-4">
  <div>
    <h3 className="text-3xl font-black">
      Pedido #{String(order.orderNumber).padStart(3, "0")}
    </h3>

    <p className="mt-1 text-sm font-bold text-zinc-500">
      Hora: {formatTime(order.createdAt)}
    </p>
    <p className="mt-1 text-sm font-black text-zinc-700">
  Cliente: {order.customerName || "Sin nombre"}
</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <span
        className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
          isOnlineOrder(order)
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {getOrderSourceLabel(order)}
      </span>

      {isOnlineOrder(order) && (
        <span className="rounded-full bg-purple-100 px-4 py-2 text-xs font-black uppercase text-purple-700">
          {getFulfillmentLabel(order)}
        </span>
      )}

      {isOnlineOrder(order) && order.fulfillmentType === "scheduled" && (
        <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-black uppercase text-yellow-700">
          {formatScheduledFor(order.scheduledFor)}
        </span>
      )}
    </div>
  </div>

  <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black">
    Pendiente
  </span>
</div>

                    <div className="space-y-5">
                      {order.items.map((item) => {
                        const groupedModifiers = groupModifiers(item.modifiers);

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl bg-zinc-50 p-4"
                          >
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
                        <button
                          onClick={() => printOrderTicket(order)}
                          className="rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-black text-white"
                        >
                          Imprimir comanda
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order, "ready")}
                          disabled={updatingOrderId === order.id}
                          className="rounded-2xl bg-[#10B557] px-6 py-4 text-lg font-black text-white disabled:bg-zinc-300"
                        >
                          {updatingOrderId === order.id
                            ? "Actualizando..."
                            : "Marcar como listo"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-black">Listos</h2>

            {readyOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="font-bold text-zinc-500">
                  Todavía no hay pedidos listos.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredReadyOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-3xl bg-white p-5 opacity-80 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-3xl font-black">
                          Pedido #{String(order.orderNumber).padStart(3, "0")}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          Hora: {formatTime(order.createdAt)}
                        </p>
                        <p className="mt-1 text-sm font-black text-zinc-700">
  Cliente: {order.customerName || "Sin nombre"}
</p>
                      </div>

                      <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
                        Listo
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => printOrderTicket(order)}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-black text-white"
                      >
                        Reimprimir comanda
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order, "pending")}
                        disabled={updatingOrderId === order.id}
                        className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-black"
                      >
                        Volver a pendiente
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}