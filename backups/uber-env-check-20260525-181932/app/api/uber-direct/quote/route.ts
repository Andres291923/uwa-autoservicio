import { NextResponse } from "next/server";

export const runtime = "nodejs";

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Falta variable de entorno ${name}`);
  }

  return String(value).trim();
}

function optionalEnv(name: string) {
  return String(process.env[name] || "").trim();
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function normalizeUberFee(rawFee: unknown, currency: string) {
  const number = Math.round(Number(rawFee || 0));

  if (!Number.isFinite(number) || number <= 0) return 0;

  // Uber Direct suele devolver el fee en subunidad.
  // Para CLP lo normalizamos a pesos chilenos.
  if (currency.toUpperCase() === "CLP") {
    return Math.round(number / 100);
  }

  return number;
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
  body.set("scope", "eats.deliveries");

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
    console.error("UBER_DIRECT_TOKEN_ERROR", data);

    throw new Error(
      data?.error_description ||
        data?.error ||
        "Uber rechazó las credenciales."
    );
  }

  cachedToken = {
    accessToken: String(data.access_token),
    expiresAt: now + Number(data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

function buildPickupAddressText() {
  const street = requiredEnv("UBER_DIRECT_PICKUP_STREET");
  const city = requiredEnv("UBER_DIRECT_PICKUP_CITY");
  const state = requiredEnv("UBER_DIRECT_PICKUP_STATE");
  const zipCode = requiredEnv("UBER_DIRECT_PICKUP_POSTAL_CODE");
  const country = optionalEnv("UBER_DIRECT_PICKUP_COUNTRY") || "CL";

  return `${street}, ${city}, ${state}, ${zipCode}, ${country}`;
}

function buildDropoffAddressText(params: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  return `${params.street}, ${params.city}, ${params.state}, ${params.zipCode}, ${params.country}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = cleanText(body.name || body.customerName);
    const phone = cleanPhone(body.phone || body.deliveryPhone);
    const street = cleanText(body.street || body.address || body.deliveryAddress);
    const city = cleanText(body.city || "Concepción");
    const state = cleanText(body.state || "Biobio");
    const zipCode = cleanText(body.zipCode || body.postalCode || "4030000");
    const country = cleanText(body.country || "CL");
    const instructions = cleanText(body.instructions || body.deliveryInstructions);

    if (!name) {
      return NextResponse.json(
        { error: "Falta nombre del cliente." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Falta teléfono del cliente." },
        { status: 400 }
      );
    }

    if (!street) {
      return NextResponse.json(
        { error: "Falta dirección de entrega." },
        { status: 400 }
      );
    }

    const token = await getUberDirectToken();
    const customerId =
      optionalEnv("UBER_DIRECT_ORG_ID") ||
      requiredEnv("UBER_DIRECT_CUSTOMER_ID");
    const externalStoreId = requiredEnv("UBER_DIRECT_EXTERNAL_STORE_ID");

    const pickupAddress = buildPickupAddressText();
    const dropoffAddress = buildDropoffAddressText({
      street,
      city,
      state,
      zipCode,
      country,
    });

    const payload = {
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      external_store_id: externalStoreId,
    };

    console.log("UBER_DIRECT_QUOTE_PAYLOAD", payload);

    const response = await fetch(
      `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
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
      console.error("UBER_DIRECT_QUOTE_ERROR", {
        payload,
        data,
      });

      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.title ||
            data?.code ||
            "Uber Direct no pudo cotizar esta dirección.",
          payload,
          detail: data,
        },
        { status: response.status }
      );
    }

    const quoteId = String(data.id || data.quote_id || "");
    const currency = String(data.currency_type || data.currency || "CLP").toUpperCase();
    const rawFee = Number(data.fee || 0);
    const fee = normalizeUberFee(rawFee, currency);

    return NextResponse.json({
      ok: true,
      publicId: quoteId,
      quoteId,
      fee,
      currency,
      expiresAt: data.expires || data.expires_at || null,
      duration: data.duration || null,
      pickupDuration: data.pickup_duration || null,
      dropoffEta: data.dropoff_eta || null,
      externalStoreId,
      pickupAddress,
      dropoffAddress,
      customer: {
        name,
        phone,
        address: street,
        city,
        state,
        zipCode,
        country,
        instructions,
      },
    });
  } catch (error) {
    console.error("UBER_DIRECT_QUOTE_ROUTE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cotizar Uber Direct.",
      },
      { status: 500 }
    );
  }
}





