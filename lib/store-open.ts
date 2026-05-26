import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function getChileDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getChileMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

export async function getStoreOpenStatusNow() {
  const now = new Date();
  const dayOfWeek = getChileDayOfWeek(now);
  const currentMinutes = getChileMinutes(now);

  const schedule = await prisma.storeOpeningHour.findUnique({
    where: {
      businessSettingsId_dayOfWeek: {
        businessSettingsId: 1,
        dayOfWeek,
      },
    },
  });

  if (!schedule || !schedule.enabled) {
    return {
      isOpen: false,
      dayOfWeek,
      currentMinutes,
      schedule: null,
      message: "Tienda cerrada.",
    };
  }

  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    isOpen,
    dayOfWeek,
    currentMinutes,
    schedule,
    message: isOpen
      ? "Tienda abierta."
      : "Tienda cerrada. Solo puedes programar retiro.",
  };
}

export function isScheduledFulfillment(value: unknown) {
  return value === "scheduled";
}

export function storeClosedResponseMessage() {
  return "Tienda cerrada. Por ahora solo puedes programar tu pedido para retiro.";
}
