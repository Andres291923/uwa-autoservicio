"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
  disabled?: boolean;
  badge?: string;
};

const mainMenu: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "D",
  },
  {
    label: "Productos",
    href: "/admin",
    icon: "P",
  },
  {
    label: "Configuracion",
    href: "/admin/settings",
    icon: "C",
  },
  {
    label: "Reportes",
    href: "/admin/reports",
    icon: "R",
  },
  {
    label: "Inventario",
    href: "/admin/inventory",
    icon: "I",
    disabled: true,
    badge: "Pronto",
  },
  {
    label: "Clientes",
    href: "/admin/customers",
    icon: "CL",
  },
  {
    label: "Beneficios",
    href: "/admin/benefits",
    icon: "B",
    disabled: true,
    badge: "Pronto",
  },
];

const operationMenu: MenuItem[] = [
  {
    label: "Ver totem",
    href: "/totem",
    icon: "T",
  },
  {
    label: "Ver cocina",
    href: "/cocina",
    icon: "CO",
  },
];

function MenuLink({ item }: { item: MenuItem }) {
  const pathname = usePathname();

  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href);

  if (item.disabled) {
    return (
      <div className="flex cursor-not-allowed items-center justify-between rounded-2xl px-4 py-3 text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-xs font-black">
            {item.icon}
          </span>

          <span className="text-sm font-black">{item.label}</span>
        </div>

        {item.badge && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase text-zinc-400">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.href}
      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
        isActive
          ? "bg-[#10B557] text-white shadow-lg shadow-green-200"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${
            isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {item.icon}
        </span>

        <span className="text-sm font-black">{item.label}</span>
      </div>

      {isActive && <span className="text-lg font-black">{">"}</span>}
    </a>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    }

    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-zinc-950">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10B557] text-lg font-black text-white shadow-lg shadow-green-200">
              OS
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#10B557]">
                Admin
              </p>
              <h1 className="text-lg font-black leading-tight">
                Autoservicio OS
              </h1>
            </div>
          </div>

          <p className="mt-4 text-xs font-bold leading-relaxed text-zinc-500">
            Sistema configurable para restaurante, cafeteria, heladeria o cualquier negocio.
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            Gestion
          </p>

          <div className="space-y-2">
            {mainMenu.map((item) => (
              <MenuLink key={`${item.label}-${item.href}`} item={item} />
            ))}
          </div>

          <p className="mb-3 mt-8 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            Operacion
          </p>

          <div className="space-y-2">
            {operationMenu.map((item) => (
              <MenuLink key={`${item.label}-${item.href}`} item={item} />
            ))}
          </div>
        </nav>

        <div className="border-t border-zinc-100 p-4">
          <button
            onClick={logout}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black text-white shadow-lg shadow-zinc-200 transition hover:bg-zinc-800"
          >
            Salir
          </button>

          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            Autoservicio OS
          </p>
        </div>
      </aside>

      <main className="min-h-screen pl-[280px]">
        <div className="mx-auto max-w-[1500px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
