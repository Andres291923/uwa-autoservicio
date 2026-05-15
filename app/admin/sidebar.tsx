"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";
import {
  LayoutDashboard,
  Package2,
  Settings,
  BarChart3,
  Boxes,
  Users,
  ChefHat,
  ChevronRight,
} from "lucide-react";
import type { ComponentType } from "react";

type SidebarItem = {
  key: string;
  label: string;
  subtitle: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  bg: string;
  iconColor: string;
  activeClass: string;
};

const menuItems: SidebarItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    subtitle: "Vista general",
    href: "/admin",
    icon: LayoutDashboard,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    activeClass: "bg-gradient-to-r from-emerald-500 to-emerald-600",
  },
  {
    key: "products",
    label: "Productos",
    subtitle: "Catalogo y modificadores",
    href: "/admin/products",
    icon: Package2,
    bg: "bg-sky-50",
    iconColor: "text-sky-600",
    activeClass: "bg-gradient-to-r from-sky-500 to-sky-600",
  },
  {
    key: "settings",
    label: "Configuracion",
    subtitle: "Negocio y permisos",
    href: "/admin/settings",
    icon: Settings,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    activeClass: "bg-gradient-to-r from-violet-500 to-violet-600",
  },
  {
    key: "reports",
    label: "Reportes",
    subtitle: "Ventas y dinero",
    href: "/admin/reports",
    icon: BarChart3,
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    activeClass: "bg-gradient-to-r from-amber-500 to-amber-600",
  },
  {
    key: "inventory",
    label: "Inventario",
    subtitle: "Stock y control",
    href: "/admin/inventory",
    icon: Boxes,
    bg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    activeClass: "bg-gradient-to-r from-cyan-500 to-cyan-600",
  },
  {
    key: "customers",
    label: "Clientes",
    subtitle: "Billetera y cashback",
    href: "/admin/customers",
    icon: Users,
    bg: "bg-pink-50",
    iconColor: "text-pink-600",
    activeClass: "bg-gradient-to-r from-pink-500 to-pink-600",
  },
  {
    key: "kitchen",
    label: "Cocina",
    subtitle: "Comandas",
    href: "/cocina",
    icon: ChefHat,
    bg: "bg-orange-50",
    iconColor: "text-orange-600",
    activeClass: "bg-gradient-to-r from-orange-500 to-orange-600",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminSidebar({
  visibleKeys,
}: {
  visibleKeys: string[];
}) {
  const pathname = usePathname();

  const visibleMenu = menuItems.filter((item) => visibleKeys.includes(item.key));

  return (
    <aside className="hidden w-[330px] shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-full flex-col p-6">
        <div className="mb-8 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#10B557]">
            Panel privado
          </p>

          <h1 className="mt-2 text-3xl font-black leading-none text-zinc-950">
            Autoservicio
          </h1>

          <p className="mt-3 text-sm font-semibold text-zinc-500">
            Operacion y control del negocio.
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`group flex items-center justify-between rounded-3xl border px-4 py-4 transition-all duration-200 ${
                  active
                    ? `border-transparent ${item.activeClass} text-white shadow-lg`
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      active ? "bg-white/20" : item.bg
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        active ? "text-white" : item.iconColor
                      }`}
                    />
                  </div>

                  <div>
                    <p
                      className={`text-base font-black ${
                        active ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {item.label}
                    </p>

                    <p
                      className={`text-xs font-bold ${
                        active ? "text-white/80" : "text-zinc-500"
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${
                    active ? "text-white" : "text-zinc-400"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            Sistema
          </p>
          <p className="mt-2 text-sm font-black text-zinc-800">
            UWA Autoservicio
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            Panel privado por permisos
          </p>
        </div>

        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

