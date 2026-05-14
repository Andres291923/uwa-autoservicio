import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const defaultHours = [
  { dayOfWeek: 1, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 2, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 3, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 4, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 5, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 6, enabled: true, openTime: "10:00", closeTime: "16:00" },
  { dayOfWeek: 0, enabled: false, openTime: "10:00", closeTime: "16:00" },
];

function isAdmin(request: Request) {
  if (process.env.NODE_ENV === "development") return true;

  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

async function ensureHours() {
  const existing = await prisma.storeOpeningHour.findMany({
    where: { businessSettingsId: 1 },
    orderBy: { dayOfWeek: "asc" },
  });

  if (existing.length >= 7) return existing;

  for (const item of defaultHours) {
    await prisma.storeOpeningHour.upsert({
      where: {
        businessSettingsId_dayOfWeek: {
          businessSettingsId: 1,
          dayOfWeek: item.dayOfWeek,
        },
      },
      update: {},
      create: {
        businessSettingsId: 1,
        ...item,
      },
    });
  }

  return prisma.storeOpeningHour.findMany({
    where: { businessSettingsId: 1 },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function GET() {
  try {
    const settings = await prisma.businessSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    const hours = await ensureHours();

    return NextResponse.json({ settings, hours });
  } catch (error) {
    console.error("GET_STORE_HOURS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los horarios." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const hours = Array.isArray(body.hours) ? body.hours : [];

    for (const item of hours) {
      const dayOfWeek = Number(item.dayOfWeek);
      const enabled = Boolean(item.enabled);
      const openTime = String(item.openTime || "10:00").slice(0, 5);
      const closeTime = String(item.closeTime || "18:00").slice(0, 5);

      if (dayOfWeek < 0 || dayOfWeek > 6) continue;

      await prisma.storeOpeningHour.upsert({
        where: {
          businessSettingsId_dayOfWeek: {
            businessSettingsId: 1,
            dayOfWeek,
          },
        },
        update: {
          enabled,
          openTime,
          closeTime,
        },
        create: {
          businessSettingsId: 1,
          dayOfWeek,
          enabled,
          openTime,
          closeTime,
        },
      });
    }

    const updated = await prisma.storeOpeningHour.findMany({
      where: { businessSettingsId: 1 },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ hours: updated });
  } catch (error) {
    console.error("SAVE_STORE_HOURS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron guardar los horarios." },
      { status: 500 }
    );
  }
}
