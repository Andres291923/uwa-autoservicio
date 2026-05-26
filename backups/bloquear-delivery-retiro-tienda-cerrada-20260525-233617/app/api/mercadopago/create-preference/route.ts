import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { calculateWalletBreakdown } from "@/lib/wallet";

export const runtime = "nodejs";

type PreferenceBody = {
  flow?: "personal_order" | "company_order" | "company_wallet_recharge";
  amount?: number;
  customerId?: number | null;
  companyCustomerId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  walletAmountUsed?: number;
  discountCouponCode?: string | null;
  orderSource?: string;
  fulfillmentType?: string;
  scheduledFor?: string | null;
  deliveryMethod?: "pickup" | "uber_direct";
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryInstructions?: string | null;
  uberQuotePublicId?: string | null;
  uberDeliveryFee?: number;
  items?: {
    productId: number;
    quantity?: number;
    modifierOptionIds?: number[];
  }[];
};

function cleanNumber(value: unknown) {
  const numberValue = Math.round(Number(value || 0));
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
}

function normalizeCouponCode(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function calculateOrderAmount(body: PreferenceBody) {
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    throw new Error("El pedido no tiene productos.");
  }

  let subtotalAmount = 0;

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Math.max(1, Number(item.quantity || 1));

    if (!productId) throw new Error("Producto inválido.");

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.active === false) {
      throw new Error("Uno de los productos no está disponible.");
    }

    const modifierOptionIds = Array.isArray(item.modifierOptionIds)
      ? item.modifierOptionIds.map(Number).filter(Boolean)
      : [];

    const selectedOptions =
      modifierOptionIds.length > 0
        ? await prisma.modifierOption.findMany({
            where: {
              id: { in: modifierOptionIds },
              active: true,
            },
          })
        : [];

    const modifiersTotal = selectedOptions.reduce(
      (sum, option) => sum + option.price,
      0
    );

    subtotalAmount += (product.price + modifiersTotal) * quantity;
  }

  let discountAmount = 0;
  const couponCode = normalizeCouponCode(body.discountCouponCode);

  if (body.flow === "personal_order" && couponCode) {
    const coupon = await prisma.discountCoupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || coupon.active === false) {
      throw new Error("Cupón inválido o inactivo.");
    }

    const discountPercent = Math.max(1, Math.min(100, coupon.percent));
    discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
  }

  const totalAfterDiscount = Math.max(0, subtotalAmount - discountAmount);

  const deliveryMethod = body.deliveryMethod === "uber_direct" ? "uber_direct" : "pickup";
  const uberDeliveryFee =
    deliveryMethod === "uber_direct" ? cleanNumber(body.uberDeliveryFee) : 0;

  if (deliveryMethod === "uber_direct") {
    if (!body.uberQuotePublicId) {
      throw new Error("Falta cotización de Uber Direct.");
    }

    if (uberDeliveryFee <= 0) {
      throw new Error("Uber Direct no devolvió un valor de despacho válido.");
    }

    if (!body.deliveryAddress || !body.deliveryPhone) {
      throw new Error("Faltan datos de entrega para Uber Direct.");
    }
  }

  const totalWithDelivery = totalAfterDiscount + uberDeliveryFee;

  let walletAmountUsed = 0;
  const requestedWalletAmount = cleanNumber(body.walletAmountUsed);

  if (body.flow === "personal_order" && body.customerId && requestedWalletAmount > 0) {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(body.customerId) },
      include: { walletTransactions: true },
    });

    if (!customer || customer.active === false) {
      throw new Error("Cliente no encontrado o inactivo.");
    }

    const walletBalance = calculateWalletBreakdown(customer.walletTransactions).totalBalance;
    walletAmountUsed = Math.min(requestedWalletAmount, walletBalance, totalWithDelivery);
  }

  if (body.flow === "company_order" && body.companyCustomerId && requestedWalletAmount > 0) {
    const company = await prisma.companyCustomer.findUnique({
      where: { id: Number(body.companyCustomerId) },
    });

    if (!company || company.active === false) {
      throw new Error("Empresa no encontrada o inactiva.");
    }

    walletAmountUsed = Math.min(
      requestedWalletAmount,
      Number(company.walletBalance || 0),
      totalWithDelivery
    );
  }

  return {
    subtotalAmount,
    discountAmount,
    walletAmountUsed,
    deliveryMethod,
    uberDeliveryFee,
    amountToPay: Math.max(0, totalWithDelivery - walletAmountUsed),
  };
}

export async function POST(request: Request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL || "";

    const mpSettings = await prisma.mercadoPagoSettings.findUnique({
      where: { id: 1 },
    });

    if (!mpSettings || !mpSettings.enabled) {
      return NextResponse.json(
        { error: "Mercado Pago está desactivado en configuración." },
        { status: 400 }
      );
    }

    if (!mpSettings.accessToken || !mpSettings.publicKey) {
      return NextResponse.json(
        { error: "Faltan credenciales de Mercado Pago en configuración." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as PreferenceBody;
    const flow = body.flow || "personal_order";

    if (!["personal_order", "company_order", "company_wallet_recharge"].includes(flow)) {
      return NextResponse.json(
        { error: "Flujo de pago inválido." },
        { status: 400 }
      );
    }

    const publicId = crypto.randomUUID();

    let amountToPay = 0;
    let calculatedPayload: any = {};

    if (flow === "company_wallet_recharge") {
      amountToPay = cleanNumber(body.amount);

      if (!body.companyCustomerId) {
        return NextResponse.json(
          { error: "Falta empresa para recargar saldo." },
          { status: 400 }
        );
      }

      if (amountToPay < 1000) {
        return NextResponse.json(
          { error: "La recarga mínima es $1.000." },
          { status: 400 }
        );
      }

      const company = await prisma.companyCustomer.findUnique({
        where: { id: Number(body.companyCustomerId) },
      });

      if (!company || company.active === false) {
        return NextResponse.json(
          { error: "Empresa no encontrada o inactiva." },
          { status: 400 }
        );
      }

      calculatedPayload = {
        amountToPay,
        companyName: company.companyName,
        companyEmail: company.email,
      };
    } else {
      const calculation = await calculateOrderAmount({
        ...body,
        flow,
      });

      amountToPay = calculation.amountToPay;
      calculatedPayload = calculation;

      if (amountToPay <= 0) {
        return NextResponse.json(
          {
            error:
              "El total a pagar con Mercado Pago es $0. Si se usa saldo completo, este flujo debe crear el pedido sin Mercado Pago.",
          },
          { status: 400 }
        );
      }
    }

    const title =
      flow === "company_wallet_recharge"
        ? "Recarga saldo empresa"
        : flow === "company_order"
        ? "Pedido empresa"
        : "Pedido online";

    const intent = await prisma.mercadoPagoPaymentIntent.create({
      data: {
        publicId,
        flow,
        status: "created",
        amount: amountToPay,
        customerId: body.customerId ? Number(body.customerId) : null,
        companyCustomerId: body.companyCustomerId ? Number(body.companyCustomerId) : null,
        payloadJson: JSON.stringify({
          ...body,
          flow,
          calculated: calculatedPayload,
          mercadoPagoEnvironment: mpSettings.environment,
        }),
      },
    });

    const preferencePayload: any = {
      items: [
        {
          id: publicId,
          title,
          quantity: 1,
          currency_id: "CLP",
          unit_price: amountToPay,
        },
      ],
      external_reference: publicId,
      metadata: {
        public_id: publicId,
        intent_id: intent.id,
        flow,
      },
      back_urls: {
        success: `${appUrl}/pago/mercadopago/retorno?intent=${publicId}&result=success&flow=${flow}`,
        failure: `${appUrl}/pago/mercadopago/retorno?intent=${publicId}&result=failure&flow=${flow}`,
        pending: `${appUrl}/pago/mercadopago/retorno?intent=${publicId}&result=pending&flow=${flow}`,
      },
    };

    if (body.customerEmail) {
      preferencePayload.payer = {
        name: body.customerName || undefined,
        email: body.customerEmail,
      };
    }

    if (webhookUrl) {
      preferencePayload.notification_url = webhookUrl;
    }

    const mercadoPagoResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpSettings.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencePayload),
      }
    );

    const mercadoPagoData = await mercadoPagoResponse.json();

    if (!mercadoPagoResponse.ok) {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "error",
          lastError: JSON.stringify(mercadoPagoData).slice(0, 1000),
        },
      });

      return NextResponse.json(
        {
          error: "Mercado Pago rechazó la preferencia.",
          detail: mercadoPagoData,
        },
        { status: 400 }
      );
    }

    const updatedIntent = await prisma.mercadoPagoPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "preference_created",
        preferenceId: mercadoPagoData.id || null,
        initPoint: mercadoPagoData.init_point || null,
        sandboxInitPoint: mercadoPagoData.sandbox_init_point || null,
      },
    });

    const checkoutUrl =
      mpSettings.environment === "production"
        ? updatedIntent.initPoint
        : updatedIntent.sandboxInitPoint || updatedIntent.initPoint;

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      publicId,
      intentId: updatedIntent.id,
      preferenceId: updatedIntent.preferenceId,
      initPoint: updatedIntent.initPoint,
      sandboxInitPoint: updatedIntent.sandboxInitPoint,
      amount: amountToPay,
      environment: mpSettings.environment,
    });
  } catch (error) {
    console.error("MERCADOPAGO_CREATE_PREFERENCE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la preferencia de Mercado Pago.",
      },
      { status: 500 }
    );
  }
}



