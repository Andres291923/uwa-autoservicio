"use client";

import { useEffect, useState } from "react";

type PublicSettings = {
  businessName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  idleBackgroundUrl?: string | null;
};

const defaultSettings: PublicSettings = {
  businessName: "Autoservicio",
  logoUrl: null,
  primaryColor: "#10B557",
  idleBackgroundUrl: null,
};

export default function HomePage() {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");

      if (!response.ok) return;

      const data = await response.json();

      setSettings({
        ...defaultSettings,
        ...data,
      });
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const backgroundImage = settings.idleBackgroundUrl || "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950">
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt={settings.businessName || "Pantalla de reposo"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800" />
      )}

      <div className="absolute inset-0 bg-black/25" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {settings.logoUrl && (
          <div className="mb-8 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] bg-white/95 p-3 shadow-2xl">
            <img
              src={settings.logoUrl}
              alt={settings.businessName || "Logo"}
              className="h-full w-full object-contain"
            />
          </div>
        )}

        <p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-white/80">
          {settings.businessName || "Autoservicio"}
        </p>

        <a
          href="/totem"
          className="rounded-[2rem] px-12 py-8 text-4xl font-black uppercase text-white shadow-2xl transition active:scale-95"
          style={{
            background: settings.primaryColor || "#10B557",
          }}
        >
          Pide aquí
        </a>

        <p className="mt-6 text-lg font-bold text-white/80">
          Toca la pantalla para comenzar tu pedido
        </p>
      </section>
    </main>
  );
}
