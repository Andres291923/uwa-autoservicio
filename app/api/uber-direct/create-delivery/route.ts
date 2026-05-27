import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

const postalCodeByCity: Record<string, string> = {
  "ConcepciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n": "4030000",
  "HualpÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©n": "4600000",
  "Talcahuano": "4260000",
  "Chiguayante": "4100000",
  "San Pedro de la Paz": "4130000",
  "Coronel": "4190000",
  "Penco": "4150000",
  "TomÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©": "4160000",
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Falta variable de entorno ${name}`);
  }

  return String(value).trim().replace(/^[\'"]|[\'"]$/g, "").trim();
}

function optionalEnv(name: string) {
  return String(process.env[name] || "").trim().replace(/^[\'"]|[\'"]$/g, "").trim();
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\s+/g, "").trim();
}

async function getUberDirectToken() {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams();

  body.set("client_id", requiredEnv("UBER_DIRECT_CLIENT_ID"));
  body.set("client_secret", requiredEnv("UBER_DIRECT_CLIENT_SECRET"));
  body.set("grant_type", "client_credentials");
  body.set(
    "scope",
    optionalEnv("UBER_DIRECT_MODE") === "production"
      ? "eats.deliveries"
      : "eats.deliveries direct.organizations"
  );

  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "UWA-Direct-Next",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Uber rechazÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ las credenciales."
    );
  }

  cachedToken = {
    accessToken: String(data.access_token),
    expiresAt: now + Number(data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

function buildPickupAddressText() {
  const saved = optionalEnv("UBER_DIRECT_STORE_PICKUP_ADDRESS");

  if (saved) return saved;

  return [
    requiredEnv("UBER_DIRECT_PICKUP_STREET"),
    requiredEnv("UBER_DIRECT_PICKUP_CITY"),
    requiredEnv("UBER_DIRECT_PICKUP_STATE"),
    requiredEnv("UBER_DIRECT_PICKUP_POSTAL_CODE"),
    optionalEnv("UBER_DIRECT_PICKUP_COUNTRY") || "CL",
  ].join(", ");
}

function buildDropoffAddressText(params: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  return [
    params.street,
    params.city,
    params.state,
    params.zipCode,
    params.country,
  ].join(", ");
}

function appendText(base: string | null | undefined, extra: string) {
  return [base || "", extra].filter(Boolean).join(" | ").slice(0, 500);
}

function findUberVerificationCode(value: any): string {
  const seen = new Set<any>();

  function walk(input: any): string {
    if (!input || typeof input !== "object") return "";
    if (seen.has(input)) return "";
    seen.add(input);

    for (const [key, raw] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();

      if (
        typeof raw === "string" &&
        raw.trim() &&
        (lowerKey.includes("pin") ||
          lowerKey.includes("code") ||
          lowerKey.includes("verification"))
      ) {
        return raw.trim();
      }

      if (typeof raw === "number" && lowerKey.includes("pin")) {
        return String(raw);
      }

      if (raw && typeof raw === "object") {
        const found = walk(raw);
        if (found) return found;
      }
    }

    return "";
  }

  return walk(value);
}

function parseUberDate(value: any) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId = Number(body.orderId || 0);
    const quoteId = cleanText(body.quoteId || body.uberQuotePublicId);
    const customerName = cleanText(body.customerName || "Cliente");
    const deliveryAddress = cleanText(body.deliveryAddress);
    const deliveryCity = cleanText(body.deliveryCity || "ConcepciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n");
    const deliveryState = cleanText(body.deliveryState || "Biobio");
    const deliveryZipCode =
      cleanText(body.deliveryZipCode || body.zipCode) ||
      postalCodeByCity[deliveryCity] ||
      "4030000";
    const deliveryCountry = cleanText(body.deliveryCountry || "CL");
    const deliveryPhone = cleanPhone(body.deliveryPhone);
    const deliveryInstructions = cleanText(body.deliveryInstructions);

    if (!orderId) {
      return NextResponse.json(
        { error: "Falta orderId para crear delivery Uber." },
        { status: 400 }
      );
    }

    if (!quoteId) {
      return NextResponse.json(
        { error: "Falta quoteId de Uber Direct." },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryPhone) {
      return NextResponse.json(
        { error: "Faltan datos de entrega Uber Direct." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    const token = await getUberDirectToken();

    const orgId =
      optionalEnv("UBER_DIRECT_MODE") === "production"
        ? requiredEnv("UBER_DIRECT_CUSTOMER_ID")
        : optionalEnv("UBER_DIRECT_ORG_ID") ||
          requiredEnv("UBER_DIRECT_CUSTOMER_ID");

    const externalStoreId = requiredEnv("UBER_DIRECT_EXTERNAL_STORE_ID");

    const pickupAddress = buildPickupAddressText();

    const dropoffAddress = buildDropoffAddressText({
      street: deliveryAddress,
      city: deliveryCity,
      state: deliveryState,
      zipCode: deliveryZipCode,
      country: deliveryCountry,
    });

    const pickupReadyDate = new Date(Date.now() + 10 * 60 * 1000);

    const manifestItems =
      order.items.length > 0
        ? order.items.map((item) => ({
            name: item.product?.name || "Producto",
            quantity: item.quantity,
            price: Math.round(Number(item.total || item.unitPrice || 0) * 100),
          }))
        : [
            {
              name: `Pedido #${order.orderNumber}`,
              quantity: 1,
              price: Math.round(Number(order.total || 0) * 100),
            },
          ];

    const payload: any = {
      pickup_name: optionalEnv("UBER_DIRECT_PICKUP_NAME") || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œWA",
      pickup_address: pickupAddress,
      pickup_phone_number: cleanPhone(
        optionalEnv("UBER_DIRECT_PICKUP_PHONE") || "+56997971213"
      ),
      dropoff_name: customerName,
      dropoff_address: dropoffAddress,
      dropoff_phone_number: deliveryPhone,
      dropoff_notes:
        deliveryInstructions || `Pedido #${order.orderNumber} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œWA`,
      manifest_items: manifestItems,
      manifest_reference: `UWA-${order.orderNumber}`,
      manifest_total_value: Math.round(Number(order.total || 0) * 100),
      quote_id: quoteId,
      external_store_id: externalStoreId,
      pickup_ready_dt: pickupReadyDate.toISOString(),

    };

    if (optionalEnv("UBER_DIRECT_MODE") === "test") {
      payload.test_specifications = {
        robo_courier_specification: {
          mode: "auto",
        },
      };
    }

    console.log("UBER_DIRECT_CREATE_DELIVERY_PAYLOAD", payload);

    const response = await fetch(
      `https://api.uber.com/v1/customers/${orgId}/deliveries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "UWA-Direct-Next",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("UBER_DIRECT_CREATE_DELIVERY_ERROR", {
        payload,
        data,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          customerComment: appendText(
            order.customerComment,
            "UBER DIRECT ERROR: No se pudo crear delivery."
          ),
        },
      });

      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.title ||
            data?.code ||
            "Uber Direct no pudo crear el delivery.",
          detail: data,
          payload,
        },
        { status: response.status }
      );
    }

    const trackingUrl = data.tracking_url || "";
    const deliveryId = data.uuid || data.id || "";
    const deliveryStatus = String(data.status || "created");
    const deliveryCode = findUberVerificationCode(data);
    const dropoffEta = parseUberDate(data.dropoff_eta);

    const extraComment = [
      "UBER DIRECT CREADO",
      deliveryId ? `ID: ${deliveryId}` : "",
      trackingUrl ? `Tracking: ${trackingUrl}` : "",
      deliveryCode ? `CÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³digo entrega: ${deliveryCode}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerComment: appendText(order.customerComment, extraComment),
        uberDeliveryId: deliveryId || null,
        uberTrackingUrl: trackingUrl || null,
        uberDeliveryStatus: deliveryStatus || null,
        uberDeliveryCode: deliveryCode || null,
        uberDropoffEta: dropoffEta,
      },
    });

    return NextResponse.json({
      ok: true,
      deliveryId,
      trackingUrl,
      status: data.status || "",
      uber: data,
    });
  } catch (error) {
    console.error("UBER_DIRECT_CREATE_DELIVERY_ROUTE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear delivery Uber Direct.",
      },
      { status: 500 }
    );
  }
}







