"use client";

import { useEffect, useState } from "react";

type BusinessSettings = {
  id: number;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  kioskSubtitle: string;
  kioskTitle: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      setSettings(data);
    } catch (error) {
      console.error(error);
      setMessage("No se pudo cargar la configuracion.");
    }
  }

  async function uploadLogo(file: File) {
    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo subir el logo.");
        return;
      }

      setSettings((current) =>
        current ? { ...current, logoUrl: data.url } : current
      );

      setMessage("Logo subido correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error al subir logo.");
    } finally {
      setUploading(false);
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/settings", {
        method: "PUT",
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

      setSettings(data);
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
      <main className="min-h-screen bg-zinc-50 p-8">
        <p className="text-xl font-black">Cargando configuracion...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Panel Admin
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Configuracion del negocio
            </h1>

            <p className="mt-2 max-w-2xl text-zinc-500">
              Personaliza el sistema para cualquier restaurante, cafeteria,
              heladeria o negocio. Esto alimentara el totem.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
          >
            Volver al admin
          </a>
        </header>

        <form
          onSubmit={saveSettings}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <section className="grid gap-8 md:grid-cols-[260px_1fr]">
            <div>
              <p className="text-sm font-black uppercase text-zinc-500">
                Logo del negocio
              </p>

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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadLogo(file);
                  }}
                />

                <span className="inline-block cursor-pointer rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white">
                  {uploading ? "Subiendo..." : "Subir logo"}
                </span>
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

            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Nombre del negocio
                </span>

                <input
                  value={settings.businessName}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      businessName: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  placeholder="Ej: UWA, Cafe Central, Heladeria Sur"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Color principal
                </span>

                <div className="mt-2 flex gap-3">
                  <input
                    value={settings.primaryColor}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        primaryColor: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    placeholder="#10B557"
                  />

                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        primaryColor: event.target.value,
                      })
                    }
                    className="h-12 w-20 rounded-xl border border-zinc-300 bg-white"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Texto superior del totem
                </span>

                <input
                  value={settings.kioskSubtitle}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      kioskSubtitle: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  placeholder="Ej: Autoservicio"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Titulo principal del totem
                </span>

                <input
                  value={settings.kioskTitle}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      kioskTitle: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  placeholder="Ej: Elige tus productos"
                />
              </label>

              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-black uppercase text-zinc-500">
                  Vista previa
                </p>

                <div className="mt-4 flex items-center gap-4">
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
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
              {message}
            </p>
          )}

          <button
            disabled={saving}
            className="mt-6 w-full rounded-2xl py-4 text-sm font-black text-white disabled:bg-zinc-300"
            style={{ background: saving ? "#d4d4d8" : settings.primaryColor }}
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </form>
      </div>
    </main>
  );
}