const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow = null;
let working = false;
let pollTimer = null;

const defaultConfig = {
  baseUrl: "https://uwa-autoservicio.vercel.app",
  token: "",
  agentId: "uwa-agent-" + os.hostname(),
  intervalSeconds: 3,
  autoStartWithWindows: true
};

function getConfigPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function readConfig() {
  const file = getConfigPath();

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultConfig, null, 2), "utf8");
    return { ...defaultConfig };
  }

  try {
    return { ...defaultConfig, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { ...defaultConfig };
  }
}

function saveConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf8");

  app.setLoginItemSettings({
    openAtLogin: Boolean(config.autoStartWithWindows)
  });

  return config;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 620,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html"));

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function cleanText(value) {
  return String(value || "")
    .replace(/Ãœ/g, "Ü")
    .replace(/Ãº/g, "ú")
    .replace(/Ã³/g, "ó")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã±/g, "ñ");
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(price || 0));
}

function formatDate(value) {
  return new Date(value).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(text) {
  return cleanText(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isOnlineOrder(order) {
  return order.orderSource === "online" || order.totemCode === "online";
}

function isCompanyOrder(order) {
  return Boolean(
    order.companyCustomerId ||
    order.paymentMethod === "bank_transfer" ||
    order.orderSource === "company" ||
    order.orderSource === "company_worker" ||
    order.orderSource === "company_worker_totem"
  );
}

function getOrderSourceLabel(order) {
  if (isCompanyOrder(order)) return "PEDIDO EMPRESA";
  if (isOnlineOrder(order)) return "PEDIDO ONLINE";
  return "PEDIDO TOTEM";
}

function getFulfillmentLabel(order) {
  if (order.fulfillmentType === "scheduled") return "PROGRAMADO";
  return "RETIRO AHORA";
}

function groupModifiers(modifiers) {
  const grouped = {};

  for (const modifier of modifiers || []) {
    const groupName = modifier.option?.template?.name || "Modificador";
    const optionName = modifier.option?.name || "";

    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(optionName);
  }

  return grouped;
}

function buildTicketHtml(order) {
  const itemsHtml = (order.items || []).map((item) => {
    const groupedModifiers = groupModifiers(item.modifiers || []);

    const modifiersHtml = Object.entries(groupedModifiers).map(([groupName, options]) => {
      return `
        <div class="modifier-group">
          <div class="modifier-title">${escapeHtml(groupName)}</div>
          <div class="modifier-options">${escapeHtml(options.join(", "))}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="item">
        <div class="item-title">${item.quantity}x ${escapeHtml(item.product?.name || "Producto")}</div>
        ${modifiersHtml}
      </div>
    `;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background: white;
      color: black;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .ticket {
      width: 80mm;
      padding: 4mm;
    }

    @media print {
      body {
        width: 80mm;
      }

      .ticket {
        width: 80mm;
      }
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

    .source {
      margin-top: 6px;
      padding: 5px;
      border: 2px solid black;
      font-size: 15px;
      font-weight: 900;
      text-align: center;
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
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      <div class="brand">ÜWA</div>
      <div class="title">PEDIDO #${String(order.orderNumber).padStart(3, "0")}</div>
      <div class="source">${escapeHtml(getOrderSourceLabel(order))}</div>
      <div class="meta">${escapeHtml(formatDate(order.createdAt))}</div>
      ${order.customerName ? `<div class="meta">Cliente: ${escapeHtml(order.customerName)}</div>` : ""}
      ${order.fulfillmentType ? `<div class="meta">${escapeHtml(getFulfillmentLabel(order))}</div>` : ""}
      ${order.scheduledFor ? `<div class="meta">Programado: ${escapeHtml(formatDate(order.scheduledFor))}</div>` : ""}
    </div>

    <div class="line"></div>

    ${order.customerComment ? `
      <div class="comment-box">
        <div class="comment-title">COMENTARIO COCINA</div>
        ${escapeHtml(order.customerComment)}
      </div>
      <div class="line"></div>
    ` : ""}

    ${itemsHtml}

    <div class="line"></div>

    <div class="total">
      <span>TOTAL</span>
      <span>${escapeHtml(formatPrice(order.total))}</span>
    </div>

    <div class="line"></div>

    <div class="footer">
      Preparar según comanda
    </div>
  </div>
</body>
</html>
`;
}

async function getNextOrder(config) {
  const url = new URL("/api/print-agent/next", config.baseUrl).toString();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-print-agent-token": config.token,
      "x-print-agent-id": config.agentId
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo consultar cola de impresión.");
  }

  return data.order || null;
}

async function postAgent(config, pathname, body) {
  const url = new URL(pathname, config.baseUrl).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-print-agent-token": config.token,
      "x-print-agent-id": config.agentId
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar impresión.");
  }

  return data;
}

function printHtmlSilently(html) {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 420,
      height: 900,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

    printWindow.webContents.on("did-finish-load", () => {
      setTimeout(() => {
        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            usePrinterDefaultPageSize: true,
            margins: {
              marginType: "none"
            }
          },
          (success, failureReason) => {
            printWindow.close();

            if (success) {
              resolve(true);
            } else {
              reject(new Error(failureReason || "Falló la impresión silenciosa."));
            }
          }
        );
      }, 500);
    });

    printWindow.webContents.on("did-fail-load", () => {
      printWindow.close();
      reject(new Error("No se pudo cargar la comanda para imprimir."));
    });
  });
}

async function processOne() {
  if (working) return;

  const config = readConfig();

  if (!config.token) {
    sendStatus("Falta configurar token del agente.");
    return;
  }

  working = true;

  try {
    const order = await getNextOrder(config);

    if (!order) {
      sendStatus("Sin comandas pendientes.");
      return;
    }

    sendStatus(`Imprimiendo pedido #${String(order.orderNumber).padStart(3, "0")}...`);

    const html = buildTicketHtml(order);

    await printHtmlSilently(html);

    await postAgent(config, "/api/print-agent/printed", {
      orderId: order.id,
      agentId: config.agentId
    });

    sendStatus(`Pedido #${String(order.orderNumber).padStart(3, "0")} impreso correctamente.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendStatus("Error: " + message);
  } finally {
    working = false;
  }
}

function sendStatus(message) {
  console.log(message);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("status", {
      message,
      at: new Date().toLocaleString("es-CL")
    });
  }
}

function startPolling() {
  const config = readConfig();
  const interval = Math.max(1, Number(config.intervalSeconds || 3)) * 1000;

  if (pollTimer) clearInterval(pollTimer);

  processOne();
  pollTimer = setInterval(processOne, interval);

  sendStatus("Agente activo. Usando impresora predeterminada de Windows.");
}

ipcMain.handle("get-config", () => {
  return readConfig();
});

ipcMain.handle("save-config", (_event, config) => {
  const saved = saveConfig({ ...readConfig(), ...config });
  startPolling();
  return saved;
});

ipcMain.handle("test-print", async () => {
  const testOrder = {
    id: 0,
    orderNumber: 999,
    createdAt: new Date().toISOString(),
    customerName: "Prueba impresión",
    customerComment: "Esta es una prueba del agente UWA.",
    orderSource: "test",
    fulfillmentType: "immediate",
    total: 1234,
    items: [
      {
        quantity: 1,
        product: { name: "Bowl de prueba" },
        modifiers: [
          {
            option: {
              name: "Arroz",
              template: { name: "Base" }
            }
          },
          {
            option: {
              name: "Pollo",
              template: { name: "Proteína" }
            }
          }
        ]
      }
    ]
  };

  await printHtmlSilently(buildTicketHtml(testOrder));
  return true;
});

app.whenReady().then(() => {
  const config = readConfig();

  app.setLoginItemSettings({
    openAtLogin: Boolean(config.autoStartWithWindows)
  });

  createWindow();
  startPolling();
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
