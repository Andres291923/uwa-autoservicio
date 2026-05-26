import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TOKEN_SCOPE = "eats.deliveries";

function cleanEnv(name: string) {
  return String(process.env[name] || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function mask(value: string) {
  if (!value) return "FALTA";

  if (value.length <= 8) {
    return `OK len=${value.length}`;
  }

  return `${value.slice(0, 4)}********${value.slice(-4)} len=${value.length}`;
}

export async function GET() {
  const clientId = cleanEnv("UBER_DIRECT_CLIENT_ID");
  const clientSecret = cleanEnv("UBER_DIRECT_CLIENT_SECRET");
  const customerId = cleanEnv("UBER_DIRECT_CUSTOMER_ID");
  const orgId = cleanEnv("UBER_DIRECT_ORG_ID");
  const externalStoreId = cleanEnv("UBER_DIRECT_EXTERNAL_STORE_ID");

  const base = {
    ok: false,
    runtime: "vercel-or-local",
    requestedScope: TOKEN_SCOPE,
    env: {
      UBER_DIRECT_MODE: cleanEnv("UBER_DIRECT_MODE") || "FALTA",
      UBER_DIRECT_CLIENT_ID: mask(clientId),
      UBER_DIRECT_CLIENT_SECRET: clientSecret ? `OK len=${clientSecret.length}` : "FALTA",
      UBER_DIRECT_CUSTOMER_ID: mask(customerId),
      UBER_DIRECT_ORG_ID: mask(orgId),
      UBER_DIRECT_EXTERNAL_STORE_ID: externalStoreId || "FALTA",
      UBER_DIRECT_PICKUP_STREET: cleanEnv("UBER_DIRECT_PICKUP_STREET") || "FALTA",
      UBER_DIRECT_PICKUP_CITY: cleanEnv("UBER_DIRECT_PICKUP_CITY") || "FALTA",
      UBER_DIRECT_PICKUP_STATE: cleanEnv("UBER_DIRECT_PICKUP_STATE") || "FALTA",
      UBER_DIRECT_PICKUP_POSTAL_CODE: cleanEnv("UBER_DIRECT_PICKUP_POSTAL_CODE") || "FALTA",
      UBER_DIRECT_PICKUP_COUNTRY: cleanEnv("UBER_DIRECT_PICKUP_COUNTRY") || "FALTA",
    },
  };

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      ...base,
      error: "Faltan clientId o clientSecret en runtime.",
    });
  }

  try {
    const body = new URLSearchParams();
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    body.set("grant_type", "client_credentials");
    body.set("scope", TOKEN_SCOPE);

    const response = await fetch("https://auth.uber.com/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        ...base,
        ok: false,
        status: response.status,
        uberError: data,
      });
    }

    return NextResponse.json({
      ...base,
      ok: true,
      status: response.status,
      receivedScope: data.scope || "",
      expiresIn: data.expires_in || null,
    });
  } catch (error) {
    return NextResponse.json({
      ...base,
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido.",
    });
  }
}
