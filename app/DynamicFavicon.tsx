"use client";

import { useEffect } from "react";

type Settings = {
  faviconUrl?: string | null;
};

function setFavicon(url: string) {
  const selectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel='apple-touch-icon']",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => element.remove());
  });

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href = url;
  document.head.appendChild(icon);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.href = url;
  document.head.appendChild(shortcut);

  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.href = url;
  document.head.appendChild(apple);
}

export default function DynamicFavicon() {
  useEffect(() => {
    async function loadFavicon() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const data = (await response.json()) as Settings;

        if (data.faviconUrl) {
          setFavicon(data.faviconUrl);
        }
      } catch {
        // Si falla, queda el favicon por defecto.
      }
    }

    loadFavicon();
  }, []);

  return null;
}
