"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      className="fixed right-6 top-6 z-50 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white shadow-lg"
    >
      Salir
    </button>
  );
}