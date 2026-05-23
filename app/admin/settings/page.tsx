"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type BusinessSettings = {
  id: number;
  businessName: string;
  logoUrl: string | null;
  idleBackgroundUrl: string | null;
  primaryColor: string;
  kioskSubtitle: string;
  kioskTitle: string;
  tipsEnabled: boolean;
  tipPercent: number;
};

const emptySettings: BusinessSettings = {
  id: 1,
  businessName: "Mi negocio",
  logoUrl: null,
  idleBackgroundUrl: null,
  primaryColor: "#10B557",
  kioskSubtitle: "Autoservicio",
  kioskTitle: "Elige tus productos",
  tipsEnabled: false,
  tipPercent: 10,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIdle, setUploadingIdle] = useState(false);

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      setSettings({
        ...emptySettings,
        ...data,
      });
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar la configuracion.");
      setSettings(emptySettings);
    }
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    target: "logoUrl" | "idleBackgroundUrl"
  ) {
    try {
      const file = event.target.files?.[0];

      if (!file || !settings) return;

      if (target === "logoUrl") {
        setUploadingLogo(true);} else {
        setUploadingIdle(true);
      }

      setMessage("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("image", file);

      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo subir la imagen.");
        return;
      }

      setSettings({
        ...settings,
        [target]: data.url,
      });

      setMessage(
        target === "logoUrl"
          ? "Logo subido correctamente. Recuerda guardar configuracion."
            : "Imagen de reposo subida correctamente. Recuerda guardar configuracion."
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al subir imagen.");
    } finally {
      setUploadingLogo(false);
      setUploadingIdle(false);
      event.target.value = "";
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar la configuracion.");
        return;
      }

      setSettings({
        ...emptySettings,
        ...data,
      });

      setMessage("Configuracion guardada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar configuracion.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  if (!settings) {
    return (
      <main className="min-h-screen p-8 text-zinc-950">
      <div className="mb-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#10B557]">
              Pagos online
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Mercado Pago
            </h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Configura credenciales de prueba o producción para pedidos y empresas.
            </p>
          </div>

          <a
            href="/admin/settings/mercadopago"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
          >
            Configurar Mercado Pago
          </a>
        </div>
      </div>
        <p className="font-black">Cargando configuracion...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-zinc-950">
      <div className="mb-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#10B557]">
              Pagos online
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Mercado Pago
            </h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Configura credenciales de prueba o producción para pedidos y empresas.
            </p>
          </div>

          <a
            href="/admin/settings/mercadopago"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
          >
            Configurar Mercado Pago
          </a>
        </div>
      </div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Configuracion
          </p>

          <h1 className="mt-1 text-4xl font-black">
            Configuracion del sistema
          </h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Cambia logo, colores, titulos del totem e imagen de reposo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Ver reposo
          </a>

          <a
            href="/admin/settings/users"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Usuarios y permisos
          </a>

          <a
            href="/admin/settings/coupons"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Cupones online
          </a>

          <a
            href="/admin/settings/hours"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Horario tienda
          </a>

          <a
            href="/totem"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Ver totem
          </a>

          <a
            href="/admin"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            Volver
          </a>
        </div>
      </header>

      <form onSubmit={saveSettings} className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Logo del negocio</h2>

            <div className="mt-4 flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo del negocio"
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <span className="text-sm font-black text-zinc-400">
                  Sin logo
                </span>
              )}
            </div>

            <label className="mt-4 block">
              <span className="block rounded-2xl bg-zinc-950 px-5 py-4 text-center text-sm font-black text-white">
                {uploadingLogo ? "Subiendo logo..." : "Subir logo"}
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadImage(event, "logoUrl")}
                className="hidden"
              />
            </label>

            {settings.logoUrl && (
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    logoUrl: null,
                  })
                }
                className="mt-3 block rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600"
              >
                Quitar logo
              </button>
            )}
          </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Vista previa totem</h2>

            <div className="mt-4 flex items-center gap-4 rounded-3xl bg-zinc-50 p-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xs font-black text-zinc-400">
                    LOGO
                  </span>
                )}
              </div>

              <div>
                <p
                  className="text-sm font-black uppercase tracking-[0.25em]"
                  style={{ color: settings.primaryColor }}
                >
                  {settings.businessName} {settings.kioskSubtitle}
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  {settings.kioskTitle}
                </h2>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="relative aspect-[16/10] bg-zinc-950">
              {settings.idleBackgroundUrl ? (
                <img
                  src={settings.idleBackgroundUrl}
                  alt="Preview reposo"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-zinc-800" />
              )}

              <div className="absolute inset-0 bg-black/25" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-white/80">
                  {settings.businessName}
                </p>

                <div
                  className="rounded-3xl px-8 py-5 text-2xl font-black uppercase text-white shadow-2xl"
                  style={{ background: settings.primaryColor }}
                >
                  Pide aqui
                </div>

                <p className="mt-4 text-sm font-bold text-white/80">
                  Toca la pantalla para comenzar tu pedido
                </p>
              </div>
            </div>
          </div>

          {message && (
            <p className="rounded-2xl bg-zinc-100 p-4 text-sm font-black">
              {message}
            </p>
          )}

          <button
            disabled={saving}
            className="w-full rounded-2xl py-4 text-sm font-black text-white disabled:bg-zinc-300"
            style={{ background: saving ? "#d4d4d8" : settings.primaryColor }}
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </section>
      </form>
    </main>
  );
}










