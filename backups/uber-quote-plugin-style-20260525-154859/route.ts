import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UberAddress = {
  street_address: string[];
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

const postalCodeByCity: Record<string, string> = {
  "Concepción": "4030000",
  "Hualpén": "4600000",
  "Talcahuano": "4260000",
  "Chiguayante": "4100000",
  "San Pedro de la Paz": "4130000",
  "Coronel": "4190000",
  "Penco": "4150000",
  "Tomé": "4160000",
};

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

function cleanNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeState(value: string) {
  const clean = cleanText(value);
  if (!clean) return "Biobio";
  return clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function encodeAddress(address: UberAddress) {
  return JSON.stringify(address);
}

function buildPickupAddress(): UberAddress {
  return {
    street_address: [
      requiredEnv("UBER_DIRECT_PICKUP_STREET"),
      optionalEnv("UBER_DIRECT_PICKUP_STREET_2"),
    ].filter(Boolean),
    city: requiredEnv("UBER_DIRECT_PICKUP_CITY"),
    state: normalizeState(requiredEnv("UBER_DIRECT_PICKUP_STATE")),
    zip_code: requiredEnv("UBER_DIRECT_PICKUP_POSTAL_CODE"),
    country: optionalEnv("UBER_DIRECT_PICKUP_COUNTRY") || "CL",
  };
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
  body.set("scope", "direct.organizations eats.deliveries");

  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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

  const expiresIn = Number(data.expires_in || 3600);

  cachedToken = {
    accessToken: String(data.access_token),
    expiresAt: now + expiresIn * 1000,
  };

  return cachedToken.accessToken;
}

async function requestQuote(params: {
  token: string;
  customerId: string;
  pickupAddress: UberAddress;
  dropoffAddress: UberAddress;
}) {
  const payload: any = {
    pickup_address: encodeAddress(params.pickupAddress),
    dropoff_address: encodeAddress(params.dropoffAddress),
  };

  const externalStoreId = optionalEnv("UBER_DIRECT_EXTERNAL_STORE_ID");

  if (externalStoreId) {
    payload.external_store_id = externalStoreId;
  }

  const pickupLatitude = cleanNumber(optionalEnv("UBER_DIRECT_PICKUP_LATITUDE"));
  const pickupLongitude = cleanNumber(optionalEnv("UBER_DIRECT_PICKUP_LONGITUDE"));

  if (pickupLatitude !== null) payload.pickup_latitude = pickupLatitude;
  if (pickupLongitude !== null) payload.pickup_longitude = pickupLongitude;

  const response = await fetch(
    `https://api.uber.com/v1/customers/${params.customerId}/delivery_quotes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
    payload,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = cleanText(body.name || body.customerName);
    const phone = cleanPhone(body.phone || body.deliveryPhone);
    const street = cleanText(body.street || body.address || body.deliveryAddress);
    const instructions = cleanText(body.instructions || body.deliveryInstructions);

    const city = cleanText(body.city || "Concepción");
    const state = normalizeState(cleanText(body.state || "Biobío"));
    const zipCode =
      cleanText(body.zipCode || body.postalCode) ||
      postalCodeByCity[city] ||
      "4030000";
    const country = cleanText(body.country || "CL");

    if (!name) {
      return NextResponse.json({ error: "Falta nombre del cliente." }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: "Falta teléfono del cliente." }, { status: 400 });
    }

    if (!street) {
      return NextResponse.json({ error: "Falta dirección de entrega." }, { status: 400 });
    }

    const token = await getUberDirectToken();
    const customerId = requiredEnv("UBER_DIRECT_CUSTOMER_ID");
    const pickupAddress = buildPickupAddress();

    const attempts: UberAddress[] = [
      {
        street_address: [street, `${city}, ${state}, Chile`],
        city,
        state,
        zip_code: zipCode,
        country,
      },
      {
        street_address: [`${street}, ${city}, ${state}, Chile`],
        city,
        state,
        zip_code: zipCode,
        country,
      },
      {
        street_address: [`${street}, ${city}, Chile`],
        city,
        state: "",
        zip_code: zipCode,
        country,
      },
      {
        street_address: [street],
        city,
        state,
        zip_code: zipCode,
        country,
      },
    ];

    const errors: any[] = [];

    for (const dropoffAddress of attempts) {
      const result = await requestQuote({
        token,
        customerId,
        pickupAddress,
        dropoffAddress,
      });

      if (result.ok) {
        const data = result.data;
        const quoteId = String(data.id || data.quote_id || "");
        const fee = Math.round(Number(data.fee || 0));

        return NextResponse.json({
          ok: true,
          publicId: quoteId,
          quoteId,
          fee,
          currency: String(data.currency_type || data.currency || "CLP").toUpperCase(),
          expiresAt: data.expires || data.expires_at || null,
          duration: data.duration || null,
          pickupDuration: data.pickup_duration || null,
          dropoffEta: data.dropoff_eta || null,
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
          matchedAttempt: dropoffAddress,
        });
      }

      errors.push({
        status: result.status,
        message:
          result.data?.message ||
          result.data?.title ||
          result.data?.code ||
          "Uber Direct no pudo cotizar esta dirección.",
        dropoffAddress,
        detail: result.data,
      });
    }

    console.error("UBER_DIRECT_QUOTE_ALL_ATTEMPTS_FAILED", errors);

    return NextResponse.json(
      {
        error:
          errors[0]?.message ||
          "Uber Direct no pudo cotizar esta dirección.",
        attempts: errors.map((item) => ({
          status: item.status,
          message: item.message,
          dropoffAddress: item.dropoffAddress,
        })),
      },
      { status: errors[0]?.status || 400 }
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

