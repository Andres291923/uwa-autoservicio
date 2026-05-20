"use client";

import { useEffect, useState } from "react";

type AuthMode = "login" | "register";

function extractCustomer(data: any) {
  return (
    data?.customer ||
    data?.user ||
    data?.loggedCustomer ||
    data?.client ||
    data
  );
}

export default function TotemIdentificationPage() {
  const [sessionCode, setSessionCode] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionCode(String(params.get("session") || "").trim().toUpperCase());
  }, []);

  async function submit() {
    try {
      setLoading(true);
      setMessage("");

      if (!sessionCode) {
        setMessage("Sesion no valida. Vuelve a escanear el QR.");
        return;
      }

      if (!email || !password) {
        setMessage("Ingresa correo y clave.");
        return;
      }

      if (mode === "register" && !name.trim()) {
        setMessage("Ingresa tu nombre.");
        return;
      }

      const endpoint =
        mode === "login"
          ? "/api/customer-auth/login"
          : "/api/customer-auth/register";

      const authResponse = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          mode === "login"
            ? {
                email,
                password,
              }
            : {
                name,
                email,
                password,
              }
        ),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        setMessage(authData.error || "No se pudo ingresar con esa cuenta.");
        return;
      }

      const customer = extractCustomer(authData);
      const customerId = Number(customer?.id || authData?.customerId || 0);

      if (!customerId) {
        setMessage(
          "La cuenta ingreso correctamente, pero no pude obtener el ID del cliente."
        );
        return;
      }

      const linkResponse = await fetch("/api/totem-sessions/link", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: sessionCode,
          customerId,
        }),
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        setMessage(linkData.error || "No se pudo conectar con el totem.");
        return;
      }

      setMessage("Listo. Ya estas conectado al totem. Puedes volver a la tablet.");
    } catch (error) {
      console.error(error);
      setMessage("Error al identificarte. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto max-w-md rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Identificacion
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Conectar con totem
        </h1>

        <p className="mt-2 text-sm font-bold text-zinc-500">
          Usa la misma cuenta de pedidos online para ver tu saldo y acumular cashback.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              mode === "login"
                ? "bg-[#10B557] text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Ingresar
          </button>

          <button
            suppressHydrationWarning
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              mode === "register"
                ? "bg-[#10B557] text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {mode === "register" && (
          <label className="mt-5 block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Nombre
            </span>

            <input
              suppressHydrationWarning
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              placeholder="Tu nombre"
            />
          </label>
        )}

        <label className="mt-5 block">
          <span className="text-xs font-black uppercase text-zinc-500">
            Correo
          </span>

          <input
            suppressHydrationWarning
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            placeholder="correo@email.com"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase text-zinc-500">
            Clave
          </span>

          <input
            suppressHydrationWarning
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            placeholder="Clave"
          />
        </label>

        <button
          suppressHydrationWarning
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
        >
          {loading ? "Conectando..." : "Conectar con totem"}
        </button>

        {message && (
          <p
            className={`mt-5 rounded-2xl p-4 text-sm font-black ${
              message.startsWith("Listo")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
