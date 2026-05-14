import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = normalizeCode(body.code);
    const subtotal = Math.max(0, Math.round(Number(body.subtotal || 0)));

    if (!code) {
      return NextResponse.json(
        { error: "Ingresa un cupón." },
        { status: 400 }
      );
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const coupon = await prisma.discountCoupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.active) {
      return NextResponse.json(
        { error: "Cupón inválido o inactivo." },
        { status: 400 }
      );
    }

    const percent = Math.max(1, Math.min(100, coupon.percent));
    const discountAmount = Math.round(subtotal * (percent / 100));

    return NextResponse.json({
      id: coupon.id,
      name: coupon.name,
      code: coupon.code,
      percent,
      discountAmount,
    });
  } catch (error) {
    console.error("VALIDATE_COUPON_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo validar el cupón." },
      { status: 500 }
    );
  }
}
