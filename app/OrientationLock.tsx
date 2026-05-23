"use client";

import { useEffect } from "react";

export default function OrientationLock() {
  useEffect(() => {
    async function lockPortrait() {
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };

        if (orientation?.lock) {
          await orientation.lock("portrait-primary");
        }
      } catch {
        // Algunos Android/Chrome bloquean esto si no está como app instalada.
      }
    }

    lockPortrait();

    window.addEventListener("click", lockPortrait);
    window.addEventListener("touchstart", lockPortrait);
    window.addEventListener("resize", lockPortrait);
    document.addEventListener("visibilitychange", lockPortrait);

    return () => {
      window.removeEventListener("click", lockPortrait);
      window.removeEventListener("touchstart", lockPortrait);
      window.removeEventListener("resize", lockPortrait);
      document.removeEventListener("visibilitychange", lockPortrait);
    };
  }, []);

  return null;
}
