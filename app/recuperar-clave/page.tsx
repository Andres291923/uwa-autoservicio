"use client";

import { useMemo, useState } from "react";

type AccountType = "customer" | "company" | "worker";

export default function RecoverPasswordPage() {
  const params = useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }

    return new URLSearchParams(window.location.search);
  }, []);

  const token = params.get("token") || "";
  const initialType = (params.get("type") || "customer") as AccountType;

  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReset() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo enviar la recuperación.");
        return;
      }

      setMessage(
        "Si el correo existe, enviaremos instrucciones para recuperar la clave."
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al solicitar recuperación.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    try {
      setLoading(true);
      setMessage("");

      if (password !== passwordConfirm) {
        setMessage("Las claves no coinciden.");
        return;
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cambiar la clave.");
        return;
      }

      setPassword("");
      setPasswordConfirm("");
      setMessage("Clave actualizada correctamente. Ya puedes ingresar.");
    } catch (error) {
      console.error(error);
      setMessage("Error al cambiar clave.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#10B557]">
          UWA
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Recuperar clave
        </h1>

        <p className="mt-2 text-sm font-bold text-zinc-500">
          {token
            ? "Crea una nueva clave para tu cuenta."
            : "Ingresa tu correo y te enviaremos un enlace de recuperación."}
        </p>

        {!token ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Tipo de cuenta
              </span>

              <select
                value={accountType}
                onChange={(event) =>
                  setAccountType(event.target.value as AccountType)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-sm font-black outline-none focus:border-[#10B557]"
              >
                <option value="customer">Cliente</option>
                <option value="company">Empresa</option>
                <option value="worker">Trabajador empresa</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Correo
              </span>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@email.com"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-sm font-black outline-none focus:border-[#10B557]"
              />
            </label>

            <button
              type="button"
              onClick={requestReset}
              disabled={loading}
              className="w-full rounded-2xl bg-[#10B557] px-5 py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loading ? "Enviando..." : "Enviar correo de recuperación"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nueva clave
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nueva clave"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-sm font-black outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Repetir clave
              </span>

              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Repetir clave"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-4 text-sm font-black outline-none focus:border-[#10B557]"
              />
            </label>

            <button
              type="button"
              onClick={resetPassword}
              disabled={loading}
              className="w-full rounded-2xl bg-[#10B557] px-5 py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loading ? "Guardando..." : "Crear nueva clave"}
            </button>
          </div>
        )}

        {message && (
          <p className="mt-5 rounded-2xl bg-zinc-50 p-4 text-sm font-black text-zinc-700">
            {message}
          </p>
        )}

        <a
          href="/pedido"
          className="mt-5 block text-center text-sm font-black text-[#10B557]"
        >
          Volver al pedido online
        </a>
      </section>
    </main>
  );
}
