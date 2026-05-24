"use client";

import { useEffect, useState } from "react";

type Coupon = {
  id: number;
  name: string;
  code: string;
  percent: number;
  active: boolean;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsVisible, setCouponsVisible] = useState(true);
  const [savingCouponVisibility, setSavingCouponVisibility] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCouponSettings() {
    try {
      const response = await fetch("/api/settings/coupons", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) return;

      setCouponsVisible(data.couponsVisible ?? true);
    } catch (error) {
      console.error(error);
    }
  }

  async function saveCouponVisibility(nextValue: boolean) {
    try {
      setSavingCouponVisibility(true);
      setMessage("");

      const response = await fetch("/api/settings/coupons", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponsVisible: nextValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar la visibilidad de cupones.");
        return;
      }

      setCouponsVisible(data.couponsVisible ?? true);
      setMessage(
        nextValue
          ? "Los cupones ahora se muestran en pedido online."
          : "Los cupones ahora estan ocultos en pedido online."
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar visibilidad de cupones.");
    } finally {
      setSavingCouponVisibility(false);
    }
  }

  async function loadCoupons() {
    try {
      const response = await fetch("/api/coupons", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron cargar los cupones.");
        return;
      }

      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar cupones.");
    }
  }

  async function createCoupon() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/coupons", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          percent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear el cupón.");
        return;
      }

      setName("");
      setCode("");
      setPercent(10);
      setMessage("Cupón creado correctamente.");
      await loadCoupons();
    } catch (error) {
      console.error(error);
      setMessage("Error al crear cupón.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCoupon(coupon: Coupon, changes: Partial<Coupon>) {
    try {
      const updated = {
        ...coupon,
        ...changes,
      };

      const response = await fetch("/api/coupons", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo actualizar el cupón.");
        return;
      }

      setCoupons((current) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
    } catch (error) {
      console.error(error);
      setMessage("Error al actualizar cupón.");
    }
  }

  async function deleteCoupon(id: number) {
    try {
      const response = await fetch(`/api/coupons?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo eliminar el cupón.");
        return;
      }

      setCoupons((current) => current.filter((item) => item.id !== id));
      setMessage("Cupón eliminado.");
    } catch (error) {
      console.error(error);
      setMessage("Error al eliminar cupón.");
    }
  }

  useEffect(() => {
    loadCoupons();
    loadCouponSettings();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Configuración
          </p>

          <h1 className="mt-1 text-4xl font-black">Cupones online</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Estos descuentos solo se usarán en pedido online.
          </p>
        </div>

        <a
          href="/admin/settings"
          className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
        >
          Volver a configuración
        </a>
      </header>

      <section className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
              Visibilidad en pedido online
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Mostrar cupones en /pedido
            </h2>

            <p className="mt-1 text-sm font-bold text-zinc-600">
              Si lo ocultas, los clientes no veran el campo para ingresar cupon en la venta online.
            </p>
          </div>

          <button
            type="button"
            onClick={() => saveCouponVisibility(!couponsVisible)}
            disabled={savingCouponVisibility}
            className="rounded-2xl px-6 py-4 text-sm font-black text-white disabled:bg-zinc-300"
            style={{
              background: couponsVisible ? "#10B557" : "#18181b",
            }}
          >
            {savingCouponVisibility
              ? "Guardando..."
              : couponsVisible
              ? "Visible"
              : "Oculto"}
          </button>
        </div>
      </section>
      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Crear cupón</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px_140px_auto]">
          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Nombre descuento
            </span>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Bienvenida 10%"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              Código
            </span>

            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="UWA10"
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#10B557]"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-zinc-500">
              % descuento
            </span>

            <input
              type="number"
              min="1"
              max="100"
              value={percent}
              onChange={(event) =>
                setPercent(
                  Math.max(1, Math.min(100, Number(event.target.value || 1)))
                )
              }
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={createCoupon}
              disabled={saving}
              className="w-full rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {saving ? "Guardando..." : "Crear"}
            </button>
          </div>
        </div>
      </section>

      {message && (
        <p className="mb-6 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
          {message}
        </p>
      )}

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Cupones creados</h2>

        <div className="mt-5 space-y-3">
          {coupons.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-bold text-zinc-500">
              Aún no hay cupones creados.
            </p>
          ) : (
            coupons.map((coupon) => (
              <article
                key={coupon.id}
                className="grid gap-3 rounded-3xl border border-zinc-200 p-4 md:grid-cols-[1fr_150px_110px_120px_auto]"
              >
                <input
                  value={coupon.name}
                  onChange={(event) =>
                    updateCoupon(coupon, { name: event.target.value })
                  }
                  className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
                />

                <input
                  value={coupon.code}
                  onChange={(event) =>
                    updateCoupon(coupon, {
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black uppercase"
                />

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={coupon.percent}
                  onChange={(event) =>
                    updateCoupon(coupon, {
                      percent: Math.max(
                        1,
                        Math.min(100, Number(event.target.value || 1))
                      ),
                    })
                  }
                  className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                />

                <button
                  type="button"
                  onClick={() =>
                    updateCoupon(coupon, { active: !coupon.active })
                  }
                  className="rounded-2xl px-4 py-3 text-sm font-black text-white"
                  style={{
                    background: coupon.active ? "#10B557" : "#18181b",
                  }}
                >
                  {coupon.active ? "Activo" : "Inactivo"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteCoupon(coupon.id)}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600"
                >
                  Eliminar
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
