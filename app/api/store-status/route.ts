import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const timeZone = "America/Santiago";

function getChileDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
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
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

export async function GET() {
  try {
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

    const currentTime = new Intl.DateTimeFormat("es-CL", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    if (!schedule || !schedule.enabled) {
      return NextResponse.json({
        isOpen: false,
        currentTime,
        dayOfWeek,
        schedule,
        message: "Tienda cerrada.",
      });
    }

    const openMinutes = timeToMinutes(schedule.openTime);
    const closeMinutes = timeToMinutes(schedule.closeTime);

    const isOpen =
      currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    return NextResponse.json({
      isOpen,
      currentTime,
      dayOfWeek,
      schedule,
      message: isOpen
        ? "Tienda abierta."
        : "Tienda cerrada, solo puedes hacer pedidos programados.",
    });
  } catch (error) {
    console.error("STORE_STATUS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo revisar el horario de tienda." },
      { status: 500 }
    );
  }
}
