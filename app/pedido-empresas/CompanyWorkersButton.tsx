"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type WorkerTransaction = {
  id: number;
  type: string;
  amount: number;
  workerBalanceAfter: number;
  companyBalanceAfter: number;
  reason: string;
  source: string;
  createdAt: string;
};

type Worker = {
  id: number;
  name: string;
  email: string | null;
  rut: string | null;
  phone: string | null;
  active: boolean;
  walletBalance: number;
  createdAt: string;
  walletTransactions: WorkerTransaction[];
};

type Props = {
  companyId: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CL");
}

export default function CompanyWorkersButton({ companyId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [message, setMessage] = useState("");

  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerRut, setWorkerRut] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");

  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [assignAmount, setAssignAmount] = useState("");
  const [assignReason, setAssignReason] = useState("Asignacion de saldo");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadWorkers() {
    try {
      setOpen(true);
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/company-workers?companyCustomerId=${companyId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudieron cargar trabajadores.");
        return;
      }

      setWalletBalance(Number(data.company?.walletBalance || 0));
      setWorkers(Array.isArray(data.workers) ? data.workers : []);
    } catch (error) {
      console.error(error);
      setMessage("Error al cargar trabajadores.");
    } finally {
      setLoading(false);
    }
  }

  function notifyBalanceUpdated(newBalance: number) {
    window.dispatchEvent(
      new CustomEvent("company-balance-updated", {
        detail: {
          companyId,
          walletBalance: newBalance,
        },
      })
    );
  }

  async function createWorker() {
    try {
      setSavingWorker(true);
      setMessage("");

      const response = await fetch("/api/company-workers", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_worker",
          companyCustomerId: companyId,
          name: workerName,
          email: workerEmail,
          rut: workerRut,
          phone: workerPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear trabajador.");
        return;
      }

      setWorkerName("");
      setWorkerEmail("");
      setWorkerRut("");
      setWorkerPhone("");
      setMessage("Trabajador creado correctamente.");

      await loadWorkers();
    } catch (error) {
      console.error(error);
      setMessage("Error al crear trabajador.");
    } finally {
      setSavingWorker(false);
    }
  }

  async function assignBalance() {
    try {
      setAssigning(true);
      setMessage("");

      const amount = Number(assignAmount);

      if (!selectedWorkerId) {
        setMessage("Selecciona trabajador.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage("Ingresa monto valido.");
        return;
      }

      const response = await fetch("/api/company-workers", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "assign_balance",
          companyCustomerId: companyId,
          workerId: selectedWorkerId,
          amount,
          reason: assignReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo asignar saldo.");
        return;
      }

      setAssignAmount("");
      setAssignReason("Asignacion de saldo");
      setMessage("Saldo asignado correctamente.");

      const newCompanyBalance = Number(data.company?.walletBalance || 0);
      setWalletBalance(newCompanyBalance);
      notifyBalanceUpdated(newCompanyBalance);

      await loadWorkers();
    } catch (error) {
      console.error(error);
      setMessage("Error al asignar saldo.");
    } finally {
      setAssigning(false);
    }
  }

  async function toggleWorker(worker: Worker) {
    try {
      setMessage("");

      const response = await fetch("/api/company-workers", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle_worker",
          companyCustomerId: companyId,
          workerId: worker.id,
          active: !worker.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo cambiar estado.");
        return;
      }

      await loadWorkers();
    } catch (error) {
      console.error(error);
      setMessage("Error al cambiar estado.");
    }
  }

  return (
    <>
      <button
        type="button"
        suppressHydrationWarning
        onClick={loadWorkers}
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black"
      >
        Trabajadores
      </button>

      {mounted && open ? createPortal((
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 999999 }}>
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl">
            <div className="sticky top-0 z-20 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white/95 p-5 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
                  Trabajadores empresa
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Usuarios y saldo
                </h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Crea trabajadores y reparte saldo desde la cuenta empresa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            {message && (
              <p className="mb-4 rounded-2xl bg-zinc-100 p-4 text-sm font-black">
                {message}
              </p>
            )}

            <section className="mb-6 rounded-3xl bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase text-emerald-700">
                Saldo empresa disponible
              </p>
              <p className="mt-2 text-4xl font-black text-[#10B557]">
                {formatPrice(walletBalance)}
              </p>
              <p className="mt-1 text-sm font-bold text-zinc-500">
                Este saldo es el maximo que puedes repartir a trabajadores.
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-zinc-50 p-5">
                <h3 className="text-xl font-black">Crear trabajador</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Nombre
                    </span>
                    <input
                      value={workerName}
                      onChange={(event) => setWorkerName(event.target.value)}
                      placeholder="Ej: Juan Perez"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Correo
                    </span>
                    <input
                      value={workerEmail}
                      onChange={(event) => setWorkerEmail(event.target.value)}
                      placeholder="correo@empresa.cl"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      RUT
                    </span>
                    <input
                      value={workerRut}
                      onChange={(event) => setWorkerRut(event.target.value)}
                      placeholder="11111111-1"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Telefono
                    </span>
                    <input
                      value={workerPhone}
                      onChange={(event) => setWorkerPhone(event.target.value)}
                      placeholder="+569 1234 5678"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={createWorker}
                  disabled={savingWorker}
                  className="mt-5 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  {savingWorker ? "Creando..." : "Crear trabajador"}
                </button>
              </section>

              <section className="rounded-3xl bg-zinc-50 p-5">
                <h3 className="text-xl font-black">Asignar saldo</h3>

                <div className="mt-4 grid gap-4">
                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Trabajador
                    </span>
                    <select
                      value={selectedWorkerId}
                      onChange={(event) => setSelectedWorkerId(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
                    >
                      <option value="">Selecciona trabajador</option>
                      {workers
                        .filter((worker) => worker.active)
                        .map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name} - saldo {formatPrice(worker.walletBalance)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Monto
                    </span>
                    <input
                      value={assignAmount}
                      onChange={(event) => setAssignAmount(event.target.value)}
                      placeholder="Ej: 10000"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Motivo
                    </span>
                    <input
                      value={assignReason}
                      onChange={(event) => setAssignReason(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={assignBalance}
                  disabled={assigning}
                  className="mt-5 rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  {assigning ? "Asignando..." : "Asignar saldo"}
                </button>
              </section>
            </div>

            <section className="mt-6">
              <h3 className="mb-4 text-xl font-black">Trabajadores</h3>

              {loading ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
                  Cargando trabajadores...
                </div>
              ) : workers.length === 0 ? (
                <div className="rounded-3xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">
                  Aun no hay trabajadores creados.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {workers.map((worker) => (
                    <article
                      key={worker.id}
                      className="rounded-3xl border border-zinc-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-xl font-black">{worker.name}</h4>
                          <p className="text-sm font-bold text-zinc-500">
                            {worker.email || "Sin correo"}
                          </p>
                          <p className="text-sm font-bold text-zinc-500">
                            {worker.rut || "Sin RUT"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            worker.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {worker.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-black uppercase text-zinc-500">
                          Saldo trabajador
                        </p>
                        <p className="mt-1 text-3xl font-black text-[#10B557]">
                          {formatPrice(worker.walletBalance)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleWorker(worker)}
                        className="mt-4 rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-black"
                      >
                        {worker.active ? "Desactivar" : "Activar"}
                      </button>

                      {worker.walletTransactions.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Ultimos movimientos
                          </p>

                          {worker.walletTransactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="rounded-2xl bg-zinc-50 p-3 text-sm"
                            >
                              <div className="flex justify-between gap-3">
                                <p className="font-bold text-zinc-600">
                                  {formatDate(transaction.createdAt)}
                                </p>
                                <p className="font-black text-[#10B557]">
                                  {formatPrice(transaction.amount)}
                                </p>
                              </div>
                              <p className="mt-1 font-bold text-zinc-500">
                                Saldo trabajador:{" "}
                                {formatPrice(transaction.workerBalanceAfter)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ), document.body) : null}
    </>
  );
}
