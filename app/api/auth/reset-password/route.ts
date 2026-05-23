import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token || "").trim();
    const password = String(body.password || "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Token inválido." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "La clave debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt) {
      return NextResponse.json(
        { error: "El enlace no es válido o ya fue usado." },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El enlace venció. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    const newPasswordHash = hashPassword(password);

    if (resetToken.accountType === "company") {
      await prisma.companyCustomer.update({
        where: { email: resetToken.email },
        data: { passwordHash: newPasswordHash },
      });
    } else if (resetToken.accountType === "worker") {
      const worker = await prisma.companyWorker.findFirst({
        where: { email: resetToken.email },
        select: { id: true },
      });

      if (!worker) {
        return NextResponse.json(
          { error: "Cuenta no encontrada." },
          { status: 404 }
        );
      }

      await prisma.companyWorker.update({
        where: { id: worker.id },
        data: { passwordHash: newPasswordHash },
      });
    } else {
      await prisma.customer.update({
        where: { email: resetToken.email },
        data: { passwordHash: newPasswordHash },
      });
    }

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      message: "Clave actualizada correctamente.",
    });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la clave." },
      { status: 500 }
    );
  }
}
