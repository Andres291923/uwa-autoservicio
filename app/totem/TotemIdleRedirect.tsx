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
      className="fixed right-3 bottom-[105px] z-[10000] rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em] text-zinc-600 shadow-xl backdrop-blur active:scale-95"
    >
      Reposo
    </button>
  );
}
