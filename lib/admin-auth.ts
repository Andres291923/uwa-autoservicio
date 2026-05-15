import crypto from "crypto";

export const ADMIN_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Productos" },
  { key: "settings", label: "Configuracion" },
  { key: "reports", label: "Reportes" },
  { key: "customers", label: "Clientes / Billetera" },
  { key: "inventory", label: "Inventario" },
  { key: "kitchen", label: "Cocina" },
];

export function normalizeAdminEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function hashAdminPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return `pbkdf2$${salt}$${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string) {
  try {
    const [method, salt, originalHash] = storedHash.split("$");

    if (method !== "pbkdf2" || !salt || !originalHash) return false;

    const hash = crypto
      .pbkdf2Sync(password, salt, 120000, 64, "sha512")
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

export function normalizePermissions(value: unknown) {
  const allowed = ADMIN_MODULES.map((item) => item.key);

  if (!Array.isArray(value)) return "";

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => allowed.includes(item))
    )
  ).join(",");
}