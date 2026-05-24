const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const agentDir = __dirname;
const rootDir = path.resolve(agentDir, "..");
const configPath = path.join(agentDir, "config.json");

if (typeof fetch !== "function") {
  console.error("ERROR: Necesitas Node.js 18 o superior para usar fetch.");
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  console.error("ERROR: No existe print-agent/config.json");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const ticketFolder = path.resolve(rootDir, config.ticketFolder || "print-agent/tickets");

if (!fs.existsSync(ticketFolder)) {
  fs.mkdirSync(ticketFolder, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMoney(value) {
  const number = Math.round(Number(value || 0));
  return "$" + number.toLocaleString("es-CL");
}

function formatChileDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function padOrderNumber(value) {
  return String(value || 0).padStart(3, "0");
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
    const groupName = cleanText(modifier.option?.template?.name || "Modificador");
    const optionName = cleanText(modifier.option?.name || "");

    if (!optionName) continue;

    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }

    grouped[groupName].push(optionName);
  }

  return grouped;
}

function escPosTicket(order) {
  const ESC = "\x1B";
  const GS = "\x1D";

  const INIT = ESC + "@";
  const CODE_PAGE = ESC + "t" + "\x02";
  const LEFT = ESC + "a" + "\x00";
  const CENTER = ESC + "a" + "\x01";
  const BOLD_ON = ESC + "E" + "\x01";
  const BOLD_OFF = ESC + "E" + "\x00";
  const SIZE_NORMAL = GS + "!" + "\x00";
  const SIZE_DOUBLE = GS + "!" + "\x11";
  const CUT = GS + "V" + "\x42" + "\x00";

  const line = "-".repeat(42) + "\n";

  let text = "";
  text += INIT;
  text += CODE_PAGE;

  text += CENTER + BOLD_ON + SIZE_NORMAL;
  text += "UWA\n";
  text += SIZE_DOUBLE;
  text += "PEDIDO #" + padOrderNumber(order.orderNumber) + "\n";
  text += SIZE_NORMAL + BOLD_OFF;
  text += cleanText(getOrderSourceLabel(order)) + "\n";

  if (order.fulfillmentType) {
    text += cleanText(getFulfillmentLabel(order)) + "\n";
  }

  if (order.scheduledFor) {
    text += "PROGRAMADO: " + cleanText(formatChileDate(order.scheduledFor)) + "\n";
  }

  text += cleanText(formatChileDate(order.createdAt)) + "\n";

  if (order.customerName) {
    text += "CLIENTE: " + cleanText(order.customerName) + "\n";
  }

  if (order.paymentMethod) {
    text += "PAGO: " + cleanText(order.paymentMethod) + "\n";
  }

  text += LEFT + line;

  if (order.customerComment) {
    text += BOLD_ON;
    text += "COMENTARIO COCINA\n";
    text += BOLD_OFF;
    text += cleanText(order.customerComment) + "\n";
    text += line;
  }

  for (const item of order.items || []) {
    text += BOLD_ON;
    text += `${item.quantity}x ${cleanText(item.product?.name || "Producto")}\n`;
    text += BOLD_OFF;

    const grouped = groupModifiers(item.modifiers);

    for (const [groupName, options] of Object.entries(grouped)) {
      text += "  " + cleanText(groupName).toUpperCase() + ":\n";
      text += "  - " + cleanText(options.join(", ")) + "\n";
    }

    text += "\n";
  }

  text += line;
  text += BOLD_ON;
  text += "TOTAL: " + formatMoney(order.total) + "\n";
  text += BOLD_OFF;
  text += line;
  text += CENTER;
  text += "Preparar segun comanda\n";
  text += "\n\n\n\n";
  text += CUT;

  return text;
}

async function apiGetNextOrder() {
  const url = new URL("/api/print-agent/next", config.baseUrl).toString();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-print-agent-token": config.token,
      "x-print-agent-id": config.agentId || "cocina-principal",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo consultar la cola de impresion.");
  }

  return data.order || null;
}

async function apiPost(pathname, body) {
  const url = new URL(pathname, config.baseUrl).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-print-agent-token": config.token,
      "x-print-agent-id": config.agentId || "cocina-principal",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar estado de impresion.");
  }

  return data;
}

function printRawFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!config.printerName || config.printerName.includes("CAMBIAR")) {
      reject(new Error("Debes configurar printerName en print-agent/config.json"));
      return;
    }

    const ps1 = path.join(agentDir, "raw-print.ps1");

    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ps1,
        "-PrinterName",
        config.printerName,
        "-FilePath",
        filePath,
      ],
      {
        windowsHide: true,
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `PowerShell termino con codigo ${code}`));
      }
    });
  });
}

async function processOneOrder() {
  const order = await apiGetNextOrder();

  if (!order) {
    return;
  }

  const orderNumber = padOrderNumber(order.orderNumber);
  const filePath = path.join(ticketFolder, `pedido-${orderNumber}-${order.id}.bin`);

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Imprimiendo pedido #${orderNumber}`);

    const ticket = escPosTicket(order);
    fs.writeFileSync(filePath, Buffer.from(ticket, "binary"));

    await printRawFile(filePath);

    await apiPost("/api/print-agent/printed", {
      orderId: order.id,
      agentId: config.agentId || "cocina-principal",
    });

    console.log(`[OK] Pedido #${orderNumber} impreso.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[ERROR] Pedido #${orderNumber}: ${message}`);

    await apiPost("/api/print-agent/error", {
      orderId: order.id,
      agentId: config.agentId || "cocina-principal",
      error: message,
    });
  }
}

let working = false;

async function tick() {
  if (working) return;

  working = true;

  try {
    await processOneOrder();
  } catch (error) {
    console.error("[AGENTE]", error instanceof Error ? error.message : error);
  } finally {
    working = false;
  }
}

console.log("======================================");
console.log(" UWA PRINT AGENT ACTIVO");
console.log(" Base URL:", config.baseUrl);
console.log(" Impresora:", config.printerName);
console.log(" Intervalo:", config.intervalSeconds || 3, "segundos");
console.log("======================================");

tick();

setInterval(tick, Math.max(1, Number(config.intervalSeconds || 3)) * 1000);
