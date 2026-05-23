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

  return null;
}
