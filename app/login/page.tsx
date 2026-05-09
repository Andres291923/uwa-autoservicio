"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@uwa.cl");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo ingresar.");
        return;
      }

      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      setMessage("Error al intentar ingresar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-zinc-900">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            ÜWA Autoservicio
          </p>
          <h1 className="mt-3 text-3xl font-black">Ingreso administrador</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Accede para gestionar productos, categorías y modificadores.
          </p>
        </div>

        <form onSubmit={login} className="mt-8">
          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Correo
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              placeholder="admin@uwa.cl"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Clave
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              placeholder="Ingresa tu clave"
            />
          </label>

          {message && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {message}
            </p>
          )}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}