import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/mail";

type AccountType = "customer" | "company" | "worker";

function getAccountLabel(type: AccountType) {
  if (type === "company") return "empresa";
  if (type === "worker") return "trabajador";
  return "cliente";
}

async function accountExists(type: AccountType, email: string) {
  if (type === "company") {
    return Boolean(
      await prisma.companyCustomer.findUnique({
        where: { email },
        select: { id: true },
      })
    );
  }

  if (type === "worker") {
    return Boolean(
      await prisma.companyWorker.findFirst({
        where: { email },
        select: { id: true },
      })
    );
  }

  return Boolean(
    await prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    })
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const accountType = String(body.accountType || "customer") as AccountType;

    if (!email) {
      return NextResponse.json(
        { error: "El correo es obligatorio." },
        { status: 400 }
      );
    }

    if (!["customer", "company", "worker"].includes(accountType)) {
      return NextResponse.json(
        { error: "Tipo de cuenta inválido." },
        { status: 400 }
      );
    }

    const exists = await accountExists(accountType, email);

    // Por seguridad, respondemos OK aunque el correo no exista.
    if (!exists) {
      return NextResponse.json({
        ok: true,
        message: "Si el correo existe, enviaremos instrucciones de recuperación.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        accountType,
        email,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      new URL(request.url).origin;

    const resetUrl = `${appUrl}/recuperar-clave?token=${token}&type=${accountType}`;

    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      accountLabel: getAccountLabel(accountType),
    });

    return NextResponse.json({
      ok: true,
      message: "Si el correo existe, enviaremos instrucciones de recuperación.",
    });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo solicitar recuperación." },
      { status: 500 }
    );
  }
}
