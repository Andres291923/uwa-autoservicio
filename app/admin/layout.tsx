import { cookies } from "next/headers";
import AdminSidebar from "./sidebar";

const menuItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "products", label: "Productos", href: "/admin/products" },
  { key: "settings", label: "Configuracion", href: "/admin/settings" },
  { key: "reports", label: "Reportes", href: "/admin/reports" },
  { key: "inventory", label: "Inventario", href: "/admin/inventory" },
  { key: "customers", label: "Clientes", href: "/admin/customers" },
  { key: "kitchen", label: "Cocina", href: "/cocina" },
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
    ? menuItems.map((item) => item.key)
    : menuItems
        .filter((item) => permissions.includes(item.key))
        .map((item) => item.key);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex min-h-screen">
        <AdminSidebar visibleKeys={visibleMenu} />

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}