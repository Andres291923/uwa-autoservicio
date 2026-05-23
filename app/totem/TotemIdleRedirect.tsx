"use client";

import { useEffect, useRef } from "react";

const IDLE_TIME_MS = 2 * 60 * 1000;

export default function TotemIdleRedirect() {
  const timeoutRef = useRef<number | null>(null);

  function goToIdleScreen() {
    window.location.href = "/";
  }

  function resetTimer() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      goToIdleScreen();
    }, IDLE_TIME_MS);
  }

  useEffect(() => {
    const events = [
      "click",
      "touchstart",
      "touchmove",
      "mousemove",
      "keydown",
      "scroll",
    ];

    resetTimer();

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, []);

  return (
    <button
      type="button"
      onClick={goToIdleScreen}
      className="fixed left-3 top-[150px] z-[10000] w-[120px] rounded-2xl bg-zinc-950 px-3 py-3 text-center text-[11px] font-black uppercase leading-tight tracking-[0.06em] text-white shadow-xl active:scale-95"
    >
      Volver al inicio
    </button>
  );
}
