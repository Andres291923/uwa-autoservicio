import { cookies } from "next/headers";
import LogoutButton from "./logout-button";

const menuItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: "D" },
  { key: "products", label: "Productos", href: "/admin/products", icon: "P" },
  { key: "settings", label: "Configuracion", href: "/admin/settings", icon: "C" },
  { key: "reports", label: "Reportes", href: "/admin/reports", icon: "R" },
  { key: "inventory", label: "Inventario", href: "/admin/inventory", icon: "I" },
  { key: "customers", label: "Clientes", href: "/admin/customers", icon: "CL" },
  { key: "kitchen", label: "Cocina", href: "/cocina", icon: "K" },
];

function permissionsToArray(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const rawPermissions = cookieStore.get("admin_permissions")?.value || "";
  const isOwner = cookieStore.get("admin_is_owner")?.value === "1";
  const permissions = permissionsToArray(rawPermissions);

  const visibleMenu = isOwner
    ? menuItems
    : menuItems.filter((item) => permissions.includes(item.key));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[310px] shrink-0 border-r border-zinc-200 bg-white p-6 lg:flex lg:flex-col">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Panel
            </p>
            <h1 className="mt-2 text-2xl font-black">Autoservicio</h1>
          </div>

          <nav className="flex flex-1 flex-col gap-3">
            {visibleMenu.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-black text-zinc-700 hover:bg-zinc-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-xs font-black text-zinc-600">
                  {item.icon}
                </span>

                {item.label}
              </a>
            ))}
          </nav>

          <LogoutButton />
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
