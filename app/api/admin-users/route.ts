import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashAdminPassword,
  normalizeAdminEmail,
  normalizePermissions,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

function cleanUser(user: any) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function GET() {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: [{ isOwner: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(users.map(cleanUser));
  } catch (error) {
    console.error("GET_ADMIN_USERS_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los usuarios." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = normalizeAdminEmail(body.email);
    const password = String(body.password || "");
    const permissions = normalizePermissions(body.permissions);
    const active = Boolean(body.active ?? true);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Correo invalido." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La clave debe tener minimo 6 caracteres." },
        { status: 400 }
      );
    }

    const user = await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash: hashAdminPassword(password),
        permissions,
        active,
        isOwner: false,
      },
    });

    return NextResponse.json(cleanUser(user), { status: 201 });
  } catch (error: any) {
    console.error("CREATE_ADMIN_USER_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo crear el usuario." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const name = String(body.name || "").trim();
    const email = normalizeAdminEmail(body.email);
    const password = String(body.password || "");
    const permissions = normalizePermissions(body.permissions);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "Falta ID." },
        { status: 400 }
      );
    }

    const existing = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    const data: any = {
      name,
      email,
      permissions,
      active: existing.isOwner ? true : active,
    };

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "La clave debe tener minimo 6 caracteres." },
          { status: 400 }
        );
      }

      data.passwordHash = hashAdminPassword(password);
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data,
    });

    return NextResponse.json(cleanUser(user));
  } catch (error: any) {
    console.error("UPDATE_ADMIN_USER_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar el usuario." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id") || 0);

    if (!id) {
      return NextResponse.json(
        { error: "Falta ID." },
        { status: 400 }
      );
    }

    const existing = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (existing.isOwner) {
      return NextResponse.json(
        { error: "No puedes eliminar el usuario principal." },
        { status: 400 }
      );
    }

    await prisma.adminUser.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_ADMIN_USER_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el usuario." },
      { status: 500 }
    );
  }
}