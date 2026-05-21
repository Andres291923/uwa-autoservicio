"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function WorkerCreatePasswordModalButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function createPassword() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/company-worker-auth/create-password", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          rut,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear clave.");
        return;
      }

      setEmail("");
      setRut("");
      setPassword("");
      setMessage("Clave creada correctamente. Ahora puedes ingresar como trabajador.");
    } catch (error) {
      console.error(error);
      setMessage("Error al crear clave.");
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex: 999999 }}
    >
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Trabajador empresa
            </p>
            <h2 className="mt-2 text-3xl font-black">Crear clave</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Usa el correo y RUT que tu empresa registro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-black"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Correo trabajador
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@empresa.cl"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              RUT trabajador
            </span>
            <input
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              placeholder="Ej: 11111111-1"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-zinc-500">
              Nueva clave
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Crea una clave"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
            />
          </label>

          <button
            type="button"
            onClick={createPassword}
            disabled={saving}
            className="w-full rounded-2xl bg-[#10B557] px-5 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {saving ? "Creando..." : "Crear clave"}
          </button>

          {message && (
            <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-black">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="font-black text-[#10B557]"
      >
        Primera vez? Crear clave de trabajador
      </button>

      {open ? createPortal(modal, document.body) : null}
    </>
  );
}
