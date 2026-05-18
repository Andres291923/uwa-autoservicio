import crypto from "crypto";
import { calculateWalletBalance } from "@/lib/wallet";

export function normalizeCustomerEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normalizePin(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function hashTotemPin(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(pin, salt, 120000, 64, "sha512")
    .toString("hex");

  return `pinpbkdf2$${salt}$${hash}`;
}

export function verifyTotemPin(pin: string, storedHash: string) {
  try {
    const [method, salt, originalHash] = storedHash.split("$");

    if (method !== "pinpbkdf2" || !salt || !originalHash) return false;

    const hash = crypto
      .pbkdf2Sync(pin, salt, 120000, 64, "sha512")
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

export { calculateWalletBalance };

