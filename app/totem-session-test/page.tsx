import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import TotemSessionClient from "./totem-session-client";

export const dynamic = "force-dynamic";

function createCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createTotemSession() {
  let code = createCode();

  for (let i = 0; i < 5; i++) {
    const existing = await prisma.totemSession.findUnique({
      where: { code },
    });

    if (!existing) break;
    code = createCode();
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

  const session = await prisma.totemSession.create({
    data: {
      code,
      status: "waiting",
      expiresAt,
    },
  });

  return session;
}

export default async function TotemSessionTestPage() {
  const session = await createTotemSession();

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const loginUrl = `http://${host}/totem-identificacion?session=${session.code}`;

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Prueba identificación tótem
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Identifícate con tu celular
        </h1>

        <TotemSessionClient code={session.code} loginUrl={loginUrl} />
      </section>
    </main>
  );
}
