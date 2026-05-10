"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type WalletTransaction = {
  id: number;
  customerId: number;
  type: string;
  amount: number;
  reason: string;
  orderId: number | null;
  expiresAt: string | null;
  createdAt: string;
};

type Customer = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  walletTransactions: WalletTransaction[];
  walletBalance: number;
  totalCredits: number;
  totalDebits: number;
};

type CashbackRule = {
  id: number;
  name: string;
  active: boolean;
  cashbackPercent: number;
  minPurchase: number;
  maxCashback: number;
  allowedPaymentMethods: string;
  includedCategoryIds: string;
  excludedProductIds: string;
  validityDays: number;
  commercialText: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CL");
}

const emptyRuleForm = {
  id: null as number | null,
  name: "Cashback general",
  active: true,
  cashbackPercent: "10",
  minPurchase: "3000",
  maxCashback: "0",
  allowedPaymentMethods: "all",
  includedCategoryIds: "all",
  excludedProductIds: "",
  validityDays: "0",
  commercialText: "Acumula cashback en cada compra.",
  priority: "0",
  startDate: "",
  endDate: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rules, setRules] = useState<CashbackRule[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [movementType, setMovementType] = useState<"credit" | "debit">("credit");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  const [ruleForm, setRuleForm] = useState(emptyRuleForm);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((customer) => customer.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  async function loadCustomers() {
    const response = await fetch("/api/customers");
    const data = await response.json();
    setCustomers(Array.isArray(data) ? data : []);
  }

  async function loadRules() {
    const response = await fetch("/api/cashback-rules");
    const data = await response.json();
    setRules(Array.isArray(data) ? data : []);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setMessage("");

      await Promise.all([loadCustomers(), loadRules()]);
    } catch (error) {
      console.error(error);
      setMessage("No se pudieron cargar clientes o reglas.");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName,
          email: customerEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear el cliente.");
        return;
      }

      setCustomerName("");
      setCustomerEmail("");
      setSelectedCustomerId(data.id);
      setMessage("Cliente creado correctamente.");
      await loadCustomers();
    } catch (error) {
      console.error(error);
      setMessage("Error al crear cliente.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCustomer(customer: Customer) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          active: !customer.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo actualizar cliente.");
        return;
      }

      setMessage(
        !customer.active ? "Cliente activado." : "Cliente desactivado."
      );
      await loadCustomers();
    } catch (error) {
      console.error(error);
      setMessage("Error al actualizar cliente.");
    } finally {
      setLoading(false);
    }
  }

  async function createMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCustomer) {
      setMessage("Selecciona un cliente.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/wallet-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          type: movementType,
          amount: Number(movementAmount),
          reason: movementReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear el movimiento.");
        return;
      }

      setMovementAmount("");
      setMovementReason("");
      setMessage("Movimiento registrado correctamente.");
      await loadCustomers();
    } catch (error) {
      console.error(error);
      setMessage("Error al crear movimiento.");
    } finally {
      setLoading(false);
    }
  }

  function editRule(rule: CashbackRule) {
    setRuleForm({
      id: rule.id,
      name: rule.name,
      active: rule.active,
      cashbackPercent: String(rule.cashbackPercent),
      minPurchase: String(rule.minPurchase),
      maxCashback: String(rule.maxCashback),
      allowedPaymentMethods: rule.allowedPaymentMethods,
      includedCategoryIds: rule.includedCategoryIds,
      excludedProductIds: rule.excludedProductIds,
      validityDays: String(rule.validityDays),
      commercialText: rule.commercialText,
      priority: String(rule.priority),
      startDate: rule.startDate ? rule.startDate.slice(0, 10) : "",
      endDate: rule.endDate ? rule.endDate.slice(0, 10) : "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const method = ruleForm.id ? "PUT" : "POST";

      const response = await fetch("/api/cashback-rules", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: ruleForm.id,
          name: ruleForm.name,
          active: ruleForm.active,
          cashbackPercent: Number(ruleForm.cashbackPercent),
          minPurchase: Number(ruleForm.minPurchase),
          maxCashback: Number(ruleForm.maxCashback),
          allowedPaymentMethods: ruleForm.allowedPaymentMethods,
          includedCategoryIds: ruleForm.includedCategoryIds,
          excludedProductIds: ruleForm.excludedProductIds,
          validityDays: Number(ruleForm.validityDays),
          commercialText: ruleForm.commercialText,
          priority: Number(ruleForm.priority),
          startDate: ruleForm.startDate || null,
          endDate: ruleForm.endDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar la regla.");
        return;
      }

      setRuleForm(emptyRuleForm);
      setMessage(ruleForm.id ? "Regla actualizada." : "Regla creada.");
      await loadRules();
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar regla.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(rule: CashbackRule) {
    const ok = window.confirm(`¿Eliminar la regla "${rule.name}"?`);
    if (!ok) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/cashback-rules", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: rule.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo eliminar la regla.");
        return;
      }

      setMessage("Regla eliminada.");
      await loadRules();
    } catch (error) {
      console.error(error);
      setMessage("Error al eliminar regla.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <main className="min-h-screen text-zinc-950">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Clientes & Billetera
          </p>
          <h1 className="mt-1 text-4xl font-black">
            Billetera y Cashback
          </h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Administra clientes, saldo, movimientos y reglas configurables de cashback.
          </p>
        </div>

        <a
          href="/admin"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
        >
          Volver al admin
        </a>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">Clientes</p>
          <h2 className="mt-2 text-4xl font-black">{customers.length}</h2>
          <p className="mt-1 text-sm font-bold">Registrados</p>
        </div>

        <div className="rounded-3xl bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">
            Saldo total
          </p>
          <h2 className="mt-2 text-4xl font-black">
            {formatPrice(
              customers.reduce((sum, customer) => sum + customer.walletBalance, 0)
            )}
          </h2>
          <p className="mt-1 text-sm font-bold">En billeteras</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Reglas cashback
          </p>
          <h2 className="mt-2 text-4xl font-black">{rules.length}</h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Configurables
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">
            Reglas activas
          </p>
          <h2 className="mt-2 text-4xl font-black">
            {rules.filter((rule) => rule.active).length}
          </h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            En uso
          </p>
        </div>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <form
            onSubmit={createCustomer}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-2xl font-black">Crear cliente</h2>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre
              </span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ej: Andrés"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Correo
              </span>
              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="cliente@email.com"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <button
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              Guardar cliente
            </button>
          </form>

          <form
            onSubmit={saveRule}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black">
                {ruleForm.id ? "Editar regla" : "Crear regla cashback"}
              </h2>

              {ruleForm.id && (
                <button
                  type="button"
                  onClick={() => setRuleForm(emptyRuleForm)}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black"
                >
                  Nueva
                </button>
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre regla
              </span>
              <input
                value={ruleForm.name}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, name: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Porcentaje %
                </span>
                <input
                  value={ruleForm.cashbackPercent}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      cashbackPercent: event.target.value,
                    })
                  }
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Compra mínima
                </span>
                <input
                  value={ruleForm.minPurchase}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      minPurchase: event.target.value,
                    })
                  }
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Máximo cashback por compra
                </span>
                <input
                  value={ruleForm.maxCashback}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      maxCashback: event.target.value,
                    })
                  }
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  0 significa sin límite.
                </p>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Vigencia saldo días
                </span>
                <input
                  value={ruleForm.validityDays}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      validityDays: event.target.value,
                    })
                  }
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  0 significa sin vencimiento.
                </p>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Medios de pago permitidos
              </span>
              <select
                value={ruleForm.allowedPaymentMethods}
                onChange={(event) =>
                  setRuleForm({
                    ...ruleForm,
                    allowedPaymentMethods: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              >
                <option value="all">Todos</option>
                <option value="debit_credit">Solo Débito / Crédito</option>
                <option value="food_benefit">Solo Beneficio alimentación</option>
              </select>
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Categorías incluidas
                </span>
                <input
                  value={ruleForm.includedCategoryIds}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      includedCategoryIds: event.target.value,
                    })
                  }
                  placeholder="all o IDs separados por coma"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Productos excluidos
                </span>
                <input
                  value={ruleForm.excludedProductIds}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      excludedProductIds: event.target.value,
                    })
                  }
                  placeholder="IDs separados por coma"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Texto comercial
              </span>
              <input
                value={ruleForm.commercialText}
                onChange={(event) =>
                  setRuleForm({
                    ...ruleForm,
                    commercialText: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Fecha inicio
                </span>
                <input
                  value={ruleForm.startDate}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      startDate: event.target.value,
                    })
                  }
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Fecha término
                </span>
                <input
                  value={ruleForm.endDate}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      endDate: event.target.value,
                    })
                  }
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
              <input
                type="checkbox"
                checked={ruleForm.active}
                onChange={(event) =>
                  setRuleForm({
                    ...ruleForm,
                    active: event.target.checked,
                  })
                }
              />
              <span className="text-sm font-black">Regla activa</span>
            </label>

            <button
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {ruleForm.id ? "Actualizar regla" : "Guardar regla"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Clientes</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {customers.map((customer) => (
                <article
                  key={customer.id}
                  className={`rounded-2xl border p-4 ${
                    selectedCustomerId === customer.id
                      ? "border-[#10B557] bg-green-50"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">{customer.name}</h3>
                      <p className="text-sm font-bold text-zinc-500">
                        {customer.email}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        customer.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {customer.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-black text-[#10B557]">
                    {formatPrice(customer.walletBalance)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                    >
                      Ver billetera
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCustomer(customer)}
                      className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                        customer.active ? "bg-red-500" : "bg-[#10B557]"
                      }`}
                    >
                      {customer.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {selectedCustomer && (
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                    Billetera
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {selectedCustomer.name}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-zinc-500">
                    Saldo actual
                  </p>
                  <p className="mt-1 text-4xl font-black text-[#10B557]">
                    {formatPrice(selectedCustomer.walletBalance)}
                  </p>
                </div>
              </div>

              <form
                onSubmit={createMovement}
                className="mt-6 rounded-3xl bg-zinc-50 p-4"
              >
                <h3 className="text-lg font-black">Movimiento manual</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-[160px_160px_1fr]">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Tipo
                    </span>
                    <select
                      value={movementType}
                      onChange={(event) =>
                        setMovementType(event.target.value as "credit" | "debit")
                      }
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    >
                      <option value="credit">Abonar</option>
                      <option value="debit">Descontar</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Monto
                    </span>
                    <input
                      value={movementAmount}
                      onChange={(event) => setMovementAmount(event.target.value)}
                      type="number"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Motivo
                    </span>
                    <input
                      value={movementReason}
                      onChange={(event) => setMovementReason(event.target.value)}
                      placeholder="Ej: Ajuste manual, premio, devolución"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    />
                  </label>
                </div>

                <button
                  disabled={loading}
                  className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  Guardar movimiento
                </button>
              </form>

              <div className="mt-6">
                <h3 className="text-lg font-black">Historial</h3>

                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="p-3 font-black">Fecha</th>
                        <th className="p-3 font-black">Tipo</th>
                        <th className="p-3 font-black">Monto</th>
                        <th className="p-3 font-black">Motivo</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedCustomer.walletTransactions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-5 text-center font-bold text-zinc-500"
                          >
                            Sin movimientos.
                          </td>
                        </tr>
                      ) : (
                        selectedCustomer.walletTransactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="border-t border-zinc-200"
                          >
                            <td className="p-3">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td className="p-3 font-black">
                              {transaction.type === "credit"
                                ? "Abono"
                                : "Descuento"}
                            </td>
                            <td
                              className={`p-3 font-black ${
                                transaction.type === "credit"
                                  ? "text-[#10B557]"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.type === "credit" ? "+" : "-"}{" "}
                              {formatPrice(transaction.amount)}
                            </td>
                            <td className="p-3">{transaction.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Reglas cashback creadas</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {rules.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 p-5 text-center font-bold text-zinc-500">
                  Aún no hay reglas.
                </div>
              ) : (
                rules.map((rule) => (
                  <article
                    key={rule.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{rule.name}</h3>
                        <p className="mt-1 text-sm font-bold text-zinc-500">
                          {rule.cashbackPercent}% · mínimo{" "}
                          {formatPrice(rule.minPurchase)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          rule.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {rule.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-zinc-500">
                      {rule.commercialText || "Sin texto comercial"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editRule(rule)}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRule(rule)}
                        className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
