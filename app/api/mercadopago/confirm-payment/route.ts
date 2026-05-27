import { getStoreOpenStatusNow, isScheduledFulfillment, storeClosedResponseMessage } from "@/lib/store-open";
﻿import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function timeToMinutesHardLock(time: string) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function getChileDayHardLock(date: Date) {
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

function getChileMinutesHardLock(date: Date) {
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

async function isStoreOpenNowHardLock() {
  const now = new Date();
  const dayOfWeek = getChileDayHardLock(now);
  const currentMinutes = getChileMinutesHardLock(now);

  const schedule = await prisma.storeOpeningHour.findUnique({
    where: {
      businessSettingsId_dayOfWeek: {
        businessSettingsId: 1,
        dayOfWeek,
      },
    },
  });

  if (!schedule || !schedule.enabled) return false;

  const openMinutes = timeToMinutesHardLock(schedule.openTime);
  const closeMinutes = timeToMinutesHardLock(schedule.closeTime);

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function createOrderFromIntent(request: Request, intent: any, paymentId: string) {
  const payload = safeJsonParse(intent.payloadJson);

  if (!payload) {
    throw new Error("No se pudo leer el payload del intento de pago.");
  }

  const flow = String(intent.flow || payload.flow || "");

  if (flow === "company_wallet_recharge") {
    const companyCustomerId = Number(intent.companyCustomerId || payload.companyCustomerId || 0);

    if (!companyCustomerId) {
      throw new Error("Falta empresa para recargar saldo.");
    }

    const amount = Number(intent.amount || payload.amount || 0);

    const company = await prisma.companyCustomer.findUnique({
      where: { id: companyCustomerId },
    });

    if (!company || company.active === false) {
      throw new Error("Empresa no encontrada o inactiva.");
    }

    const updatedCompany = await prisma.companyCustomer.update({
      where: { id: companyCustomerId },
      data: {
        walletBalance: {
          increment: amount,
        },
      },
    });

    await prisma.companyWalletTransaction.create({
      data: {
        companyCustomerId,
        type: "credit",
        amount,
        balanceAfter: updatedCompany.walletBalance,
        reason: `Recarga Mercado Pago ${paymentId}`,
        source: "mercado_pago_recharge",
        createdBy: "mercado_pago",
      },
    });

    return {
      type: "company_wallet_recharge",
      companyCustomerId,
      amount,
      balanceAfter: updatedCompany.walletBalance,
    };
  }

  const orderBody = {
    customerId: payload.customerId || null,
    companyCustomerId: payload.companyCustomerId || null,
    customerName: payload.customerName || "Cliente Mercado Pago",
    customerComment: payload.customerComment || "",
    discountCouponCode: payload.discountCouponCode || null,
    walletAmountUsed: Number(payload.calculated?.walletAmountUsed || payload.walletAmountUsed || 0),
    totemCode: flow === "company_order" ? "empresa-mercadopago" : "online-mercadopago",
    paymentMethod: "mercado_pago",
    orderSource: flow === "company_order" ? "company" : "online",
    fulfillmentType: payload.fulfillmentType || "immediate",
    scheduledFor: payload.scheduledFor || null,
    deliveryMethod: payload.deliveryMethod || "pickup",
    deliveryAddress: payload.deliveryAddress || "",
    deliveryPhone: payload.deliveryPhone || "",
    deliveryInstructions: payload.deliveryInstructions || "",
    uberQuotePublicId: payload.uberQuotePublicId || "",
    uberDeliveryFee: Number(payload.calculated?.uberDeliveryFee || payload.uberDeliveryFee || 0),
    items: Array.isArray(payload.items) ? payload.items : [],
  };

  const orderUrl = new URL("/api/orders", request.url);

  const orderResponse = await fetch(orderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderBody),
  });

  const orderData = await orderResponse.json();

  if (!orderResponse.ok) {
    throw new Error(orderData.error || "No se pudo crear el pedido en cocina.");
  }

  let uberDelivery: any = null;

  // CREATE_UBER_DELIVERY_AFTER_PAYMENT
  if (payload.deliveryMethod === "uber_direct") {
    try {
      const deliveryResponse = await fetch(
        new URL("/api/uber-direct/create-delivery", request.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            quoteId: payload.uberQuotePublicId,
            customerName: orderBody.customerName,
            deliveryAddress: payload.deliveryAddress || "",
            deliveryCity: payload.deliveryCity || "",
            deliveryPhone: payload.deliveryPhone || "",
            deliveryInstructions: payload.deliveryInstructions || "",
          }),
        }
      );

      uberDelivery = await deliveryResponse.json();

      if (!deliveryResponse.ok) {
        console.error("UBER_DELIVERY_CREATE_AFTER_PAYMENT_FAILED", uberDelivery);
      }
    } catch (error) {
      console.error("UBER_DELIVERY_CREATE_AFTER_PAYMENT_ERROR", error);
    }
  }

  return {
    type: "order",
    orderId: orderData.id,
    orderNumber: orderData.orderNumber,
    total: orderData.total,
    uberDelivery,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const publicId = cleanText(body.intent || body.externalReference || body.external_reference);
    const paymentId = cleanText(body.paymentId || body.payment_id || body.collection_id);

    if (!publicId) {
      return NextResponse.json(
        { error: "Falta intent/external_reference." },
        { status: 400 }
      );
    }

    const intent = await prisma.mercadoPagoPaymentIntent.findUnique({
      where: { publicId },
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Intento de pago no encontrado." },
        { status: 404 }
      );
    }

    if (intent.processedAt) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        status: intent.status,
        orderId: intent.orderId,
        paymentId: intent.paymentId,
        message: "Este pago ya fue procesado.",
      });
    }

    if (!paymentId) {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "pending_no_payment_id",
          processedAt: null,
        },
      });

      return NextResponse.json({
        ok: false,
        status: "pending",
        message: "Mercado Pago volvió sin payment_id. Aún no se puede confirmar.",
      });
    }

    const mpSettings = await prisma.mercadoPagoSettings.findUnique({
      where: { id: 1 },
    });

    if (!mpSettings || !mpSettings.enabled || !mpSettings.accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago no está configurado correctamente." },
        { status: 400 }
      );
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpSettings.accessToken}`,
        },
      }
    );

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "payment_validation_error",
          paymentId,
          lastError: JSON.stringify(mpData).slice(0, 1000),
        },
      });

      return NextResponse.json(
        {
          error: "No se pudo validar el pago con Mercado Pago.",
          detail: mpData,
        },
        { status: 400 }
      );
    }

    const paymentStatus = String(mpData.status || "");
    const externalReference = String(mpData.external_reference || "");
    const paidAmount = Math.round(Number(mpData.transaction_amount || 0));

    if (externalReference && externalReference !== publicId) {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "external_reference_mismatch",
          paymentId,
          lastError: `External reference recibido: ${externalReference}`,
        },
      });

      return NextResponse.json(
        { error: "El pago no corresponde a este intento." },
        { status: 400 }
      );
    }

    if (paidAmount < Number(intent.amount || 0)) {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "amount_mismatch",
          paymentId,
          lastError: `Monto pagado ${paidAmount}, monto esperado ${intent.amount}`,
        },
      });

      return NextResponse.json(
        { error: "El monto pagado no coincide con el pedido." },
        { status: 400 }
      );
    }

    if (paymentStatus !== "approved") {
      await prisma.mercadoPagoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: `payment_${paymentStatus || "unknown"}`,
          paymentId,
          lastError: mpData.status_detail ? String(mpData.status_detail) : null,
        },
      });

      return NextResponse.json({
        ok: false,
        status: paymentStatus || "unknown",
        statusDetail: mpData.status_detail || null,
        message: "El pago aún no está aprobado.",
      });
    }

    const result = await createOrderFromIntent(request, intent, paymentId);

    const updatedIntent = await prisma.mercadoPagoPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "approved_processed",
        paymentId,
        orderId: result.type === "order" ? result.orderId : null,
        approvedAt: new Date(),
        processedAt: new Date(),
        lastError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "approved",
      intentId: updatedIntent.id,
      paymentId,
      result,
    });
  } catch (error) {
    console.error("MERCADOPAGO_CONFIRM_PAYMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar el pago.",
      },
      { status: 500 }
    );
  }
}

