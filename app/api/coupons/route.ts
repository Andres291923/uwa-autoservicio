import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(request: Request) {
  if (process.env.NODE_ENV === "development") return true;

  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

function normalizeCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function GET() {
  try {
    const coupons = await prisma.discountCoupon.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error("GET_COUPONS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los cupones." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const code = normalizeCode(body.code);
    const percent = Math.max(1, Math.min(100, Math.round(Number(body.percent || 0))));

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del descuento es obligatorio." },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "El código del cupón es obligatorio." },
        { status: 400 }
      );
    }

    const coupon = await prisma.discountCoupon.create({
      data: {
        name,
        code,
        percent,
        active: true,
      },
    });

    return NextResponse.json(coupon);
  } catch (error: any) {
    console.error("CREATE_COUPON_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un cupón con ese código." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo crear el cupón." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();

    const id = Number(body.id);
    const name = String(body.name || "").trim();
    const code = normalizeCode(body.code);
    const percent = Math.max(1, Math.min(100, Math.round(Number(body.percent || 0))));
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json({ error: "Falta ID del cupón." }, { status: 400 });
    }

    const coupon = await prisma.discountCoupon.update({
      where: { id },
      data: {
        name,
        code,
        percent,
        active,
      },
    });

    return NextResponse.json(coupon);
  } catch (error: any) {
    console.error("UPDATE_COUPON_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un cupón con ese código." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar el cupón." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Falta ID del cupón." }, { status: 400 });
    }

    await prisma.discountCoupon.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_COUPON_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el cupón." },
      { status: 500 }
    );
  }
}
