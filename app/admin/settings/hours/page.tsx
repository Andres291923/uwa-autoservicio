"use client";

import { useEffect, useState } from "react";

type StoreHour = {
  id?: number;
  dayOfWeek: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
};

const dayNames: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  0: "Domingo",
};

const defaultHours: StoreHour[] = [
  { dayOfWeek: 1, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 2, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 3, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 4, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 5, enabled: true, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 6, enabled: true, openTime: "10:00", closeTime: "16:00" },
  { dayOfWeek: 0, enabled: false, openTime: "10:00", closeTime: "16:00" },
];

export default function StoreHoursPage() {
  const [hours, setHours] = useState<StoreHour[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadHours() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/settings/hours", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron cargar los horarios.");
        return;
      }

      setHours(Array.isArray(data.hours) ? data.hours : defaultHours);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar horarios.");
    } finally {
      setLoading(false);
    }
  }

  async function saveHours() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/settings/hours", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hours }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron guardar los horarios.");
        return;
      }

      setHours(Array.isArray(data.hours) ? data.hours : hours);
      setMessage("Horario guardado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar horario.");
    } finally {
      setSaving(false);
    }
  }

  function updateHour(dayOfWeek: number, changes: Partial<StoreHour>) {
    setHours((current) =>
      current.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, ...changes } : item
      )
    );
  }

  useEffect(() => {
    loadHours();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Configuración
          </p>

          <h1 className="mt-1 text-4xl font-black">Horario de tienda</h1>

          <p className="mt-1 text-sm font-bold text-zinc-500">
            Define cuándo el local permite pedidos inmediatos.
          </p>
        </div>

        <a
          href="/admin/settings"
          className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
        >
          Volver a configuración
        </a>
      </header>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="font-black">Cargando horarios...</p>
        ) : (
          <div className="space-y-4">
            {hours
              .slice()
              .sort((a, b) => {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
              })
              .map((item) => (
                <div
                  key={item.dayOfWeek}
                  className="grid gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[160px_140px_1fr_1fr]"
                >
                  <div>
                    <p className="text-xs font-black uppercase text-zinc-400">
                      Día
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {dayNames[item.dayOfWeek]}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase text-zinc-400">
                      Estado
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        updateHour(item.dayOfWeek, {
                          enabled: !item.enabled,
                        })
                      }
                      className="mt-2 rounded-2xl px-4 py-3 text-sm font-black text-white"
                      style={{
                        background: item.enabled ? "#10B557" : "#18181b",
                      }}
                    >
                      {item.enabled ? "Abierto" : "Cerrado"}
                    </button>
                  </div>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-400">
                      Desde
                    </span>

                    <input
                      type="time"
                      value={item.openTime}
                      onChange={(event) =>
                        updateHour(item.dayOfWeek, {
                          openTime: event.target.value,
                        })
                      }
                      disabled={!item.enabled}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black disabled:bg-zinc-200"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-400">
                      Hasta
                    </span>

                    <input
                      type="time"
                      value={item.closeTime}
                      onChange={(event) =>
                        updateHour(item.dayOfWeek, {
                          closeTime: event.target.value,
                        })
                      }
                      disabled={!item.enabled}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black disabled:bg-zinc-200"
                    />
                  </label>
                </div>
              ))}
          </div>
        )}

        {message && (
          <p className="mt-5 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={saveHours}
          disabled={saving || loading}
          className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
        >
          {saving ? "Guardando..." : "Guardar horario"}
        </button>
      </section>
    </main>
  );
}
