"use client";

import { useEffect, useState } from "react";

type MercadoPagoSettings = {
  enabled: boolean;
  environment: "test" | "production";
  publicKey: string;
  accessToken: string;
  accessTokenMasked: string;
  hasAccessToken: boolean;
  webhookSecret: string;
};

const defaultSettings: MercadoPagoSettings = {
  enabled: false,
  environment: "test",
  publicKey: "",
  accessToken: "",
  accessTokenMasked: "",
  hasAccessToken: false,
  webhookSecret: "",
};

export default function MercadoPagoSettingsPage() {
  const [settings, setSettings] = useState<MercadoPagoSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/mercadopago-settings", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar la configuración.");
        return;
      }

      setSettings({
        ...defaultSettings,
        ...data,
        accessToken: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar Mercado Pago.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/admin/mercadopago-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar.");
        return;
      }

      setSettings((current) => ({
        ...current,
        ...data,
        accessToken: "",
      }));

      setMessage("Configuración de Mercado Pago guardada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar Mercado Pago.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Configuración
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Mercado Pago
            </h1>

            <p className="mt-2 text-sm font-bold text-zinc-500">
              Guarda las credenciales de prueba o producción para activar pagos online.
            </p>
          </div>

          <a
            href="/admin/settings"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
          >
            Volver a configuración
          </a>
        </div>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm">
          {loading ? (
            <div className="rounded-2xl bg-zinc-50 p-6 text-center font-black text-zinc-500">
              Cargando configuración...
            </div>
          ) : (
            <div className="space-y-5">
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-4">
                <div>
                  <p className="text-sm font-black">Activar Mercado Pago</p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">
                    Si está apagado, el sistema no debe enviar clientes a Mercado Pago.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Ambiente
                </span>

                <select
                  value={settings.environment}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      environment: event.target.value as "test" | "production",
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
                >
                  <option value="test">Prueba</option>
                  <option value="production">Producción</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Public Key
                </span>

                <input
                  value={settings.publicKey}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      publicKey: event.target.value,
                    }))
                  }
                  placeholder="TEST-... o APP_USR-..."
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Access Token
                </span>

                {settings.hasAccessToken && (
                  <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
                    Token guardado: {settings.accessTokenMasked}. Si dejas este campo vacío, se mantiene el token actual.
                  </p>
                )}

                <input
                  type="password"
                  value={settings.accessToken}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      accessToken: event.target.value,
                    }))
                  }
                  placeholder={
                    settings.hasAccessToken
                      ? "Dejar vacío para mantener el token actual"
                      : "TEST-... o APP_USR-..."
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Webhook Secret
                </span>

                <input
                  value={settings.webhookSecret}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      webhookSecret: event.target.value,
                    }))
                  }
                  placeholder="Clave interna para validar notificaciones"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />

                <p className="mt-2 text-xs font-bold text-zinc-500">
                  Por ahora puedes usar una clave interna propia. Más adelante la usamos para validar webhooks.
                </p>
              </label>

              <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
                No pegues estas claves en el chat. Guárdalas solo aquí dentro del admin.
              </div>

              {message && (
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm font-black">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white disabled:bg-zinc-300"
              >
                {saving ? "Guardando..." : "Guardar Mercado Pago"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
