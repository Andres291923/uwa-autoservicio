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

type WalletBreakdown = {
  balance: number;
  manualRecharge: number;
  cashback: number;
  debits: number;
  credits: number;
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
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isCashbackTransaction(transaction: WalletTransaction) {
  const reason = String(transaction.reason || "").toLowerCase();
  return reason.includes("cashback");
}

function getWalletBreakdown(customer: Customer): WalletBreakdown {
  const transactions = customer.walletTransactions || [];

  const credits = transactions
    .filter((transaction) => transaction.type === "credit")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const debits = transactions
    .filter((transaction) => transaction.type === "debit")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const cashback = transactions
    .filter(
      (transaction) =>
        transaction.type === "credit" && isCashbackTransaction(transaction)
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const manualRecharge = transactions
    .filter(
      (transaction) =>
        transaction.type === "credit" && !isCashbackTransaction(transaction)
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const balance =
    typeof customer.walletBalance === "number"
      ? customer.walletBalance
      : credits - debits;

  return {
    balance,
    manualRecharge,
    cashback,
    debits,
    credits,
  };
}

function getTransactionLabel(transaction: WalletTransaction) {
  if (transaction.type === "debit") return "Uso / descuento";
  if (isCashbackTransaction(transaction)) return "Cashback";
  return "Recarga manual";
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
  const [customerSearch, setCustomerSearch] = useState("");

  const [movementType, setMovementType] = useState<"credit" | "debit">("credit");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("Recarga manual");

  const [ruleForm, setRuleForm] = useState(emptyRuleForm);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((customer) => customer.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (!search) return true;

        return (
          customer.name.toLowerCase().includes(search) ||
          customer.email.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, customerSearch]);

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        const breakdown = getWalletBreakdown(customer);

        acc.balance += breakdown.balance;
        acc.manualRecharge += breakdown.manualRecharge;
        acc.cashback += breakdown.cashback;
        acc.debits += breakdown.debits;

        if (breakdown.cashback > 0) acc.customersWithCashback += 1;

        return acc;
      },
      {
        balance: 0,
        manualRecharge: 0,
        cashback: 0,
        debits: 0,
        customersWithCashback: 0,
      }
    );
  }, [customers]);

  const selectedBreakdown = selectedCustomer
    ? getWalletBreakdown(selectedCustomer)
    : null;

  async function loadCustomers() {
    const response = await fetch("/api/customers", {
      cache: "no-store",
    });
    const data = await response.json();
    setCustomers(Array.isArray(data) ? data : []);
  }

  async function loadRules() {
    const response = await fetch("/api/cashback-rules", {
      cache: "no-store",
    });
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

      const amount = Math.round(Number(movementAmount || 0));

      if (amount <= 0) {
        setMessage("Ingresa un monto mayor a cero.");
        return;
      }

      const reason =
        movementReason.trim() ||
        (movementType === "credit" ? "Recarga manual" : "Descuento manual");

      const response = await fetch("/api/wallet-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          type: movementType,
          amount,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo crear el movimiento.");
        return;
      }

      setMovementAmount("");
      setMovementReason(movementType === "credit" ? "Recarga manual" : "Descuento manual");
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

  useEffect(() => {
    setMovementReason(movementType === "credit" ? "Recarga manual" : "Descuento manual");
  }, [movementType]);

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-zinc-950 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
            Clientes & Billetera
          </p>
          <h1 className="mt-1 text-4xl font-black">Billetera y Cashback</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Clientes en lista, saldo disponible, recargas manuales, cashback e historial.
          </p>
        </div>

        <a
          href="/admin"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black shadow-sm"
        >
          Volver al admin
        </a>
      </header>

      {message && (
        <p className="mb-6 rounded-2xl bg-white p-4 text-sm font-black shadow-sm">
          {message}
        </p>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-5">
        <div className="rounded-3xl bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">Clientes</p>
          <h2 className="mt-2 text-4xl font-black">{customers.length}</h2>
          <p className="mt-1 text-sm font-bold">Registrados</p>
        </div>

        <div className="rounded-3xl bg-[#10B557] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase opacity-80">Saldo total</p>
          <h2 className="mt-2 text-4xl font-black">{formatPrice(totals.balance)}</h2>
          <p className="mt-1 text-sm font-bold">En billeteras</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">Recarga manual</p>
          <h2 className="mt-2 text-3xl font-black text-[#10B557]">
            {formatPrice(totals.manualRecharge)}
          </h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">Créditos manuales</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">Cashback</p>
          <h2 className="mt-2 text-3xl font-black text-[#10B557]">
            {formatPrice(totals.cashback)}
          </h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            {totals.customersWithCashback} clientes con cashback
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-zinc-500">Usado</p>
          <h2 className="mt-2 text-3xl font-black text-red-600">
            {formatPrice(totals.debits)}
          </h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">Saldo descontado</p>
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
              <span className="text-xs font-black uppercase text-zinc-500">Nombre</span>
              <input suppressHydrationWarning
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ej: Andrés"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">Correo</span>
              <input suppressHydrationWarning
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="cliente@email.com"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <button suppressHydrationWarning
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              Guardar cliente
            </button>
          </form>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Gestión de billetera</h2>

            {!selectedCustomer ? (
              <p className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm font-bold text-zinc-500">
                Selecciona un cliente de la lista para agregar o quitar saldo.
              </p>
            ) : (
              <>
                <div className="mt-4 rounded-3xl bg-zinc-950 p-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                    Cliente seleccionado
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{selectedCustomer.name}</h3>
                  <p className="mt-1 text-sm font-bold text-zinc-300">{selectedCustomer.email}</p>
                  <p className="mt-4 text-xs font-black uppercase text-zinc-400">Saldo actual</p>
                  <p className="mt-1 text-4xl font-black text-[#10B557]">
                    {formatPrice(selectedBreakdown?.balance || 0)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-black uppercase text-zinc-500">Recarga</p>
                    <p className="mt-1 text-2xl font-black text-[#10B557]">
                      {formatPrice(selectedBreakdown?.manualRecharge || 0)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-black uppercase text-zinc-500">Cashback</p>
                    <p className="mt-1 text-2xl font-black text-[#10B557]">
                      {formatPrice(selectedBreakdown?.cashback || 0)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-black uppercase text-zinc-500">Usado</p>
                    <p className="mt-1 text-2xl font-black text-red-600">
                      {formatPrice(selectedBreakdown?.debits || 0)}
                    </p>
                  </div>
                </div>

                <form onSubmit={createMovement} className="mt-5 rounded-3xl bg-zinc-50 p-4">
                  <h3 className="text-lg font-black">Movimiento manual</h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-zinc-500">Tipo</span>
                      <select suppressHydrationWarning
                        value={movementType}
                        onChange={(event) =>
                          setMovementType(event.target.value as "credit" | "debit")
                        }
                        className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                      >
                        <option value="credit">Agregar saldo</option>
                        <option value="debit">Quitar saldo</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase text-zinc-500">Monto</span>
                      <input suppressHydrationWarning
                        value={movementAmount}
                        onChange={(event) => setMovementAmount(event.target.value)}
                        type="number"
                        min="1"
                        placeholder="Ej: 5000"
                        className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase text-zinc-500">Motivo</span>
                    <input suppressHydrationWarning
                      value={movementReason}
                      onChange={(event) => setMovementReason(event.target.value)}
                      placeholder="Ej: Recarga manual, ajuste, devolución"
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    />
                  </label>

                  <button suppressHydrationWarning
                    disabled={loading}
                    className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
                  >
                    {movementType === "credit" ? "Agregar saldo" : "Quitar saldo"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Clientes</h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  Lista vertical con saldo, recargas y cashback por cliente.
                </p>
              </div>

              <div className="w-full max-w-md">
                <input suppressHydrationWarning
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_170px] gap-3 bg-zinc-100 px-4 py-3 text-xs font-black uppercase text-zinc-500">
                <span>Cliente</span>
                <span>Saldo</span>
                <span>Recarga</span>
                <span>Cashback</span>
                <span>Usado</span>
                <span>Acciones</span>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="bg-white p-8 text-center font-bold text-zinc-500">
                  No encontramos clientes con ese nombre o correo.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 bg-white">
                  {filteredCustomers.map((customer) => {
                    const breakdown = getWalletBreakdown(customer);
                    const hasCashback = breakdown.cashback > 0;
                    const isSelected = selectedCustomerId === customer.id;

                    return (
                      <article
                        key={customer.id}
                        className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_170px] items-center gap-3 px-4 py-4 transition ${
                          isSelected ? "bg-green-50" : "bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-black">{customer.name}</h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                customer.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {customer.active ? "Activo" : "Inactivo"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                hasCashback
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {hasCashback ? "Tiene cashback" : "Sin cashback"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                            {customer.email}
                          </p>
                        </div>

                        <p className="text-xl font-black text-[#10B557]">
                          {formatPrice(breakdown.balance)}
                        </p>

                        <p className="font-black">{formatPrice(breakdown.manualRecharge)}</p>

                        <p className="font-black text-[#10B557]">
                          {formatPrice(breakdown.cashback)}
                        </p>

                        <p className="font-black text-red-600">{formatPrice(breakdown.debits)}</p>

                        <div className="flex flex-wrap gap-2">
                          <button suppressHydrationWarning
                            type="button"
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white"
                          >
                            Billetera
                          </button>

                          <button suppressHydrationWarning
                            type="button"
                            onClick={() => toggleCustomer(customer)}
                            className={`rounded-xl px-3 py-2 text-xs font-black text-white ${
                              customer.active ? "bg-red-500" : "bg-[#10B557]"
                            }`}
                          >
                            {customer.active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {selectedCustomer && (
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                    Historial billetera
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{selectedCustomer.name}</h2>
                  <p className="mt-1 text-sm font-bold text-zinc-500">
                    {selectedCustomer.email}
                  </p>
                </div>

                <button suppressHydrationWarning
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="p-3 font-black">Fecha</th>
                      <th className="p-3 font-black">Origen</th>
                      <th className="p-3 font-black">Tipo</th>
                      <th className="p-3 font-black">Monto</th>
                      <th className="p-3 font-black">Motivo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedCustomer.walletTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-5 text-center font-bold text-zinc-500">
                          Sin movimientos.
                        </td>
                      </tr>
                    ) : (
                      selectedCustomer.walletTransactions
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                        .map((transaction) => (
                          <tr key={transaction.id} className="border-t border-zinc-200">
                            <td className="p-3">{formatDate(transaction.createdAt)}</td>
                            <td className="p-3 font-black">{getTransactionLabel(transaction)}</td>
                            <td className="p-3 font-black">
                              {transaction.type === "credit" ? "Abono" : "Descuento"}
                            </td>
                            <td
                              className={`p-3 font-black ${
                                transaction.type === "credit"
                                  ? "text-[#10B557]"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.type === "credit" ? "+" : "-"} {formatPrice(transaction.amount)}
                            </td>
                            <td className="p-3">{transaction.reason}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={saveRule}
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">
              {ruleForm.id ? "Editar regla" : "Crear regla cashback"}
            </h2>

            {ruleForm.id && (
              <button suppressHydrationWarning
                type="button"
                onClick={() => setRuleForm(emptyRuleForm)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black"
              >
                Nueva
              </button>
            )}
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-black uppercase text-zinc-500">Nombre regla</span>
            <input suppressHydrationWarning
              value={ruleForm.name}
              onChange={(event) =>
                setRuleForm({ ...ruleForm, name: event.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Porcentaje %</span>
              <input suppressHydrationWarning
                value={ruleForm.cashbackPercent}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, cashbackPercent: event.target.value })
                }
                type="number"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Compra mínima</span>
              <input suppressHydrationWarning
                value={ruleForm.minPurchase}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, minPurchase: event.target.value })
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
              <input suppressHydrationWarning
                value={ruleForm.maxCashback}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, maxCashback: event.target.value })
                }
                type="number"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
              <p className="mt-1 text-xs font-bold text-zinc-400">0 significa sin límite.</p>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Vigencia saldo días</span>
              <input suppressHydrationWarning
                value={ruleForm.validityDays}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, validityDays: event.target.value })
                }
                type="number"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
              <p className="mt-1 text-xs font-bold text-zinc-400">0 significa sin vencimiento.</p>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase text-zinc-500">Medios de pago permitidos</span>
            <select suppressHydrationWarning
              value={ruleForm.allowedPaymentMethods}
              onChange={(event) =>
                setRuleForm({ ...ruleForm, allowedPaymentMethods: event.target.value })
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
              <span className="text-xs font-black uppercase text-zinc-500">Categorías incluidas</span>
              <input suppressHydrationWarning
                value={ruleForm.includedCategoryIds}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, includedCategoryIds: event.target.value })
                }
                placeholder="all o IDs separados por coma"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Productos excluidos</span>
              <input suppressHydrationWarning
                value={ruleForm.excludedProductIds}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, excludedProductIds: event.target.value })
                }
                placeholder="IDs separados por coma"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase text-zinc-500">Texto comercial</span>
            <input suppressHydrationWarning
              value={ruleForm.commercialText}
              onChange={(event) =>
                setRuleForm({ ...ruleForm, commercialText: event.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Fecha inicio</span>
              <input suppressHydrationWarning
                value={ruleForm.startDate}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, startDate: event.target.value })
                }
                type="date"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Fecha término</span>
              <input suppressHydrationWarning
                value={ruleForm.endDate}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, endDate: event.target.value })
                }
                type="date"
                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
            <input suppressHydrationWarning
              type="checkbox"
              checked={ruleForm.active}
              onChange={(event) =>
                setRuleForm({ ...ruleForm, active: event.target.checked })
              }
            />
            <span className="text-sm font-black">Regla activa</span>
          </label>

          <button suppressHydrationWarning
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-[#10B557] py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {ruleForm.id ? "Actualizar regla" : "Guardar regla"}
          </button>
        </form>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Reglas cashback creadas</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {rules.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-5 text-center font-bold text-zinc-500">
                Aún no hay reglas.
              </div>
            ) : (
              rules.map((rule) => (
                <article key={rule.id} className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">{rule.name}</h3>
                      <p className="mt-1 text-sm font-bold text-zinc-500">
                        {rule.cashbackPercent}% · mínimo {formatPrice(rule.minPurchase)}
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
                    <button suppressHydrationWarning
                      type="button"
                      onClick={() => editRule(rule)}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                    >
                      Editar
                    </button>

                    <button suppressHydrationWarning
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
      </section>
    </main>
  );
}

