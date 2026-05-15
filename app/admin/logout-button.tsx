"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:opacity-95"
    >
      <LogOut className="h-5 w-5" />
      Salir del panel
    </button>
  );
}