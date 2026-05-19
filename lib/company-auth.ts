import crypto from "crypto";

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeRut(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return `pbkdf2$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
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
