import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashAdminPassword,
  normalizeAdminEmail,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const allPermissions = [
  "dashboard",
  "products",
  "settings",
  "reports",
  "customers",
  "inventory",
  "kitchen",
].join(",");

function cleanUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    permissions: user.permissions,
    active: user.active,
    isOwner: user.isOwner,
  };
}

function setAdminCookies(response: NextResponse, user: any) {
  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "dev-admin-session";

  response.cookies.set("admin_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set("admin_user_id", String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set("admin_permissions", user.permissions || "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set("admin_is_owner", user.isOwner ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeAdminEmail(body.email || body.correo);
    const password = String(body.password || body.clave || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Ingresa correo y clave." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (dbUser) {
      if (!dbUser.active) {
        return NextResponse.json(
          { error: "Usuario inactivo." },
          { status: 401 }
        );
      }

      const validPassword = verifyAdminPassword(password, dbUser.passwordHash);

      if (!validPassword) {
        return NextResponse.json(
          { error: "Correo o clave incorrectos." },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        ok: true,
        user: cleanUser(dbUser),
      });

      setAdminCookies(response, dbUser);

      return response;
    }

    const envEmail = normalizeAdminEmail(process.env.ADMIN_EMAIL);
    const envPassword = String(process.env.ADMIN_PASSWORD || "");

    if (email === envEmail && password === envPassword) {
      const owner = await prisma.adminUser.upsert({
        where: { email },
        update: {
          name: "Administrador principal",
          permissions: allPermissions,
          active: true,
          isOwner: true,
        },
        create: {
          name: "Administrador principal",
          email,
          passwordHash: hashAdminPassword(password),
          permissions: allPermissions,
          active: true,
          isOwner: true,
        },
      });

      const response = NextResponse.json({
        ok: true,
        user: cleanUser(owner),
      });

      setAdminCookies(response, owner);

      return response;
    }

    return NextResponse.json(
      { error: "Correo o clave incorrectos." },
      { status: 401 }
    );
  } catch (error) {
    console.error("ADMIN_LOGIN_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo iniciar sesion." },
      { status: 500 }
    );
  }
}
