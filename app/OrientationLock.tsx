"use client";

import { useEffect } from "react";

export default function OrientationLock() {
  useEffect(() => {
    let finished = false;

    async function lockPortrait() {
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };

        if (orientation?.lock) {
          await orientation.lock("portrait-primary");
        }
      } catch {
        // Algunos Android solo permiten bloquear orientación en modo app instalada.
      } finally {
        if (!finished) {
          finished = true;

          window.setTimeout(() => {
            document.body.classList.remove("orientation-booting");
          }, 700);
        }
      }
    }

    lockPortrait();

    window.addEventListener("click", lockPortrait);
    window.addEventListener("touchstart", lockPortrait);
    document.addEventListener("visibilitychange", lockPortrait);

    return () => {
      window.removeEventListener("click", lockPortrait);
      window.removeEventListener("touchstart", lockPortrait);
      document.removeEventListener("visibilitychange", lockPortrait);
    };
  }, []);

  return null;
}
