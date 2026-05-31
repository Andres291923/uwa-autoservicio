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
      const response = await fetch("/api/settings", {
        cache: "no-store",
      });

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
  const primaryColor = settings.primaryColor || "#10B557";

  return (
    <main className="fixed inset-0 h-dvh w-dvw overflow-hidden bg-zinc-950">
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt="Pantalla de reposo"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800" />
      )}

      {/* Filtro oscuro transparente sobre la imagen */}
      <div className="absolute inset-0 bg-black/35" />

      {/* Botón inferior */}
      <section className="relative z-10 flex h-dvh w-dvw items-end justify-center px-6 pb-10 sm:pb-14">
                <img
          src="/icons/uwa-app-icon-v3.png?v=3"
          alt="ÜWA"
          className="uwa-idle-logo"
        />
<a
  href="/totem"
  className="uwa-idle-start-button inline-flex w-[420px] max-w-[86vw] items-center justify-center rounded-[2rem] px-10 py-5 text-center text-4xl font-black uppercase tracking-tight text-white shadow-[0_20px_50px_rgba(0,0,0,0.50),0_0_45px_rgba(16,181,87,0.70)] ring-2 ring-white/30 transition active:scale-95 whitespace-nowrap"
  style={{
    background: primaryColor,
  }}
>
  Pide aquí
</a>
      </section>
    </main>
  );
}