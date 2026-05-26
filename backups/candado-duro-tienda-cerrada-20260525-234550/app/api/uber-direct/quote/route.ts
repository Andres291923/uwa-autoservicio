import { NextResponse } from "next/server";

export const runtime = "nodejs";

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

function cleanEnv(name: string) {
  return String(process.env[name] || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function requiredEnv(name: string) {
  const value = cleanEnv(name);

  if (!value) {
    throw new Error(`Falta variable de entorno ${name}`);
  }

  return value;
}

function optionalEnv(name: string) {
  return cleanEnv(name);
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeUberFee(rawFee: unknown, currency: string) {
  const number = Math.round(Number(rawFee || 0));

  if (!Number.isFinite(number) || number <= 0) return 0;

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
  const saved = optionalEnv("UBER_DIRECT_STORE_PICKUP_ADDRESS");

  if (saved) return removeAccents(saved);

  const street = requiredEnv("UBER_DIRECT_PICKUP_STREET");
  const city = requiredEnv("UBER_DIRECT_PICKUP_CITY");
  const state = requiredEnv("UBER_DIRECT_PICKUP_STATE");
  const zipCode = requiredEnv("UBER_DIRECT_PICKUP_POSTAL_CODE");
  const country = optionalEnv("UBER_DIRECT_PICKUP_COUNTRY") || "CL";

  return removeAccents(`${street}, ${city}, ${state}, ${zipCode}, ${country}`);
}

function buildDropoffAddressText(params: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  return removeAccents(
    `${params.street}, ${params.city}, ${params.state}, ${params.zipCode}, ${params.country}`
  );
}

async function requestQuote(params: {
  token: string;
  customerId: string;
  payload: Record<string, unknown>;
}) {
  const response = await fetch(
    `https://api.uber.com/v1/customers/${params.customerId}/delivery_quotes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        "User-Agent": "UWA-Direct-Next",
      },
      body: JSON.stringify(params.payload),
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
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

    const rootCustomerId = optionalEnv("UBER_DIRECT_CUSTOMER_ID");
    const childOrgId = optionalEnv("UBER_DIRECT_ORG_ID");
    const externalStoreId = optionalEnv("UBER_DIRECT_EXTERNAL_STORE_ID");

    const customerCandidates =
      optionalEnv("UBER_DIRECT_MODE") === "production"
        ? [{ label: "customer_id", value: rootCustomerId }].filter((item) => item.value)
        : [
            { label: "org_id", value: childOrgId },
            { label: "customer_id", value: rootCustomerId },
          ].filter((item, index, arr) => {
            return item.value && arr.findIndex((x) => x.value === item.value) === index;
          });

    if (customerCandidates.length === 0) {
      throw new Error("Falta UBER_DIRECT_CUSTOMER_ID o UBER_DIRECT_ORG_ID.");
    }

    const pickupAddress = buildPickupAddressText();
    const dropoffAddress = buildDropoffAddressText({
      street,
      city,
      state,
      zipCode,
      country,
    });

    const payloadCandidates: { label: string; payload: Record<string, unknown> }[] = [];

    if (externalStoreId) {
      payloadCandidates.push({
        label: "with_external_store_id",
        payload: {
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          external_store_id: externalStoreId,
        },
      });
    }

    payloadCandidates.push({
      label: "without_external_store_id",
      payload: {
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
      },
    });

    const attempts: any[] = [];

    for (const customer of customerCandidates) {
      for (const candidate of payloadCandidates) {
        const result = await requestQuote({
          token,
          customerId: customer.value,
          payload: candidate.payload,
        });

        attempts.push({
          customerIdKind: customer.label,
          payloadKind: candidate.label,
          status: result.status,
          error:
            result.data?.message ||
            result.data?.title ||
            result.data?.code ||
            result.data?.metadata ||
            null,
          detail: result.data,
        });

        if (result.ok) {
          const data = result.data;
          const quoteId = String(data.id || data.quote_id || "");
          const currency = String(data.currency_type || data.currency || "CLP").toUpperCase();
          const rawFee = Number(data.fee || 0);
          const fee = normalizeUberFee(rawFee, currency);

          return NextResponse.json({
            ok: true,
            publicId: quoteId,
            quoteId,
            fee,
            rawFee,
            currency,
            expiresAt: data.expires || data.expires_at || null,
            duration: data.duration || null,
            pickupDuration: data.pickup_duration || null,
            dropoffEta: data.dropoff_eta || null,
            usedCustomerIdKind: customer.label,
            usedPayloadKind: candidate.label,
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
        }
      }
    }

    console.error("UBER_DIRECT_QUOTE_ALL_ATTEMPTS_FAILED", {
      pickupAddress,
      dropoffAddress,
      attempts,
    });

    return NextResponse.json(
      {
        error:
          attempts[0]?.detail?.message ||
          attempts[0]?.detail?.title ||
          "Uber Direct no pudo cotizar esta dirección.",
        pickupAddress,
        dropoffAddress,
        attempts,
      },
      { status: 400 }
    );
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

