"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  permissions: string;
  active: boolean;
  isOwner: boolean;
};

const modules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Productos" },
  { key: "settings", label: "Configuracion" },
  { key: "reports", label: "Reportes" },
  { key: "customers", label: "Clientes / Billetera" },
  { key: "inventory", label: "Inventario" },
  { key: "kitchen", label: "Cocina" },
];

function permissionsToArray(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([
    "dashboard",
    "kitchen",
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin-users", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron cargar usuarios.");
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setActive(true);
    setPermissions(["dashboard", "kitchen"]);
  }

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  function editUser(user: AdminUser) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setActive(user.active);
    setPermissions(permissionsToArray(user.permissions));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveUser() {
    try {
      setLoading(true);
      setMessage("");

      const method = editingId ? "PUT" : "POST";

      const response = await fetch("/api/admin-users", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          name,
          email,
          password,
          active,
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar el usuario.");
        return;
      }

      setMessage(editingId ? "Usuario actualizado." : "Usuario creado.");
      resetForm();
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    const ok = window.confirm(`Eliminar usuario ${user.email}?`);
    if (!ok) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/admin-users?id=${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo eliminar usuario.");
        return;
      }

      setMessage("Usuario eliminado.");
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage("Error al eliminar usuario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Configuracion
          </p>

          <h1 className="mt-1 text-4xl font-black">Usuarios y permisos</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Crea accesos internos y define que modulos puede ver cada usuario.
          </p>
        </div>

        <a
          href="/admin/settings"
          className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
        >
          Volver a configuracion
        </a>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">
            {editingId ? "Editar usuario" : "Crear usuario"}
          </h2>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Nombre
            </span>
            <input
              suppressHydrationWarning
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Operario cocina"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Email
            </span>
            <input
              suppressHydrationWarning
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@email.com"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Clave
            </span>
            <input
              suppressHydrationWarning
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={editingId ? "Dejar vacio para no cambiar" : "Minimo 6 caracteres"}
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>
        </div>

        <div className="mt-5 rounded-3xl bg-zinc-50 p-4">
          <p className="text-xs font-black uppercase text-zinc-500">
            Permisos por modulo
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {modules.map((module) => (
              <label
                key={module.key}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={permissions.includes(module.key)}
                  onChange={() => togglePermission(module.key)}
                />

                <span className="text-sm font-black">{module.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
          <input
            suppressHydrationWarning
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span className="text-sm font-black">Usuario activo</span>
        </label>

        <button
          suppressHydrationWarning
          type="button"
          onClick={saveUser}
          disabled={loading}
          className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
        >
          {loading ? "Guardando..." : editingId ? "Actualizar usuario" : "Crear usuario"}
        </button>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Usuarios creados</h2>

        <div className="mt-5 space-y-3">
          {users.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 p-5 text-center text-sm font-bold text-zinc-500">
              Aun no hay usuarios internos creados.
            </p>
          ) : (
            users.map((user) => (
              <article
                key={user.id}
                className="grid gap-4 rounded-3xl border border-zinc-200 p-4 md:grid-cols-[1fr_1fr_140px_auto]"
              >
                <div>
                  <h3 className="text-lg font-black">{user.name}</h3>
                  <p className="text-sm font-bold text-zinc-500">{user.email}</p>
                  {user.isOwner && (
                    <p className="mt-1 text-xs font-black uppercase text-[#10B557]">
                      Principal
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-zinc-400">
                    Permisos
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-600">
                    {permissionsToArray(user.permissions)
                      .map((permission) => modules.find((module) => module.key === permission)?.label || permission)
                      .join(", ") || "Sin permisos"}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-2 text-xs font-black ${
                      user.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => editUser(user)}
                    className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white"
                  >
                    Editar
                  </button>

                  {!user.isOwner && (
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => deleteUser(user)}
                      className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}