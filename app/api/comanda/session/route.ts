import { NextResponse } from "next/server";

export const runtime = "nodejs";

function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";

  return raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + "="))
    ?.split("=")
    .slice(1)
    .join("=") || "";
}

export async function GET(request: Request) {
  const adminSession = readCookie(request, "admin_session");
  const comandaSession = readCookie(request, "comanda_session");
  const expectedComandaSession =
    process.env.COMANDA_SESSION_TOKEN || "comanda-session";

  const ok = Boolean(adminSession) || comandaSession === expectedComandaSession;

  return NextResponse.json({
    ok,
    source: adminSession ? "admin" : comandaSession ? "comanda" : "none",
  });
}