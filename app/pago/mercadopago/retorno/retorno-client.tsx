"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ConfirmResult = {
  ok?: boolean;
  alreadyProcessed?: boolean;
  status?: string;
  error?: string;
  message?: string;
  flow?: string | null;
  result?: {
    type?: string;
    orderId?: number;
    orderNumber?: number;
    total?: number;
    amount?: number;
    balanceAfter?: number;
  };
};

function formatValue(value: string | number | null | undefined) {
  const clean = String(value || "").trim();
  return clean ? clean : "No recibido";
}

function formatPrice(value: number | undefined) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function MercadoPagoReturnClient() {
  const searchParams = useSearchParams();

  const intent =
    searchParams.get("intent") || searchParams.get("external_reference") || "";
  const result = searchParams.get("result") || searchParams.get("status") || "pending";
  const flowFromUrl = searchParams.get("flow") || "";
  const paymentId =
    searchParams.get("payment_id") || searchParams.get("collection_id") || "";
  const preferenceId = searchParams.get("preference_id") || "";
  const merchantOrderId = searchParams.get("merchant_order_id") || "";

  const [confirming, setConfirming] = useState(true);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);

  const detectedFlow = String(confirmResult?.flow || flowFromUrl || "");
  const isCompanyFlow =
    detectedFlow === "company_order" ||
    detectedFlow === "company_wallet_recharge";

  const backHref = isCompanyFlow ? "/pedido-empresas" : "/pedido";
  const backLabel = isCompanyFlow
    ? "Volver a pedido empresas"
    : "Volver a pedido online";

  const title = useMemo(() => {
    if (confirming) return "Confirmando pago";
    if (confirmResult?.ok && confirmResult?.result?.type === "order")
      return "Pedido enviado a cocina";
    if (
      confirmResult?.ok &&
      confirmResult?.result?.type === "company_wallet_recharge"
    )
      return "Saldo recargado";
    if (confirmResult?.alreadyProcessed) return "Pago ya procesado";
    if (confirmResult?.status === "approved") return "Pago aprobado";
    if (confirmResult?.status === "rejected") return "Pago rechazado";
    return "Pago pendiente de confirmación";
  }, [confirming, confirmResult]);

  useEffect(() => {
    async function confirmPayment() {
      try {
        setConfirming(true);

        const response = await fetch("/api/mercadopago/confirm-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent,
            paymentId,
            result,
            preferenceId,
            merchantOrderId,
          }),
        });

        const data = await response.json();
        setConfirmResult(data);
      } catch (error) {
        console.error(error);
        setConfirmResult({
          ok: false,
          error: "Error al confirmar el pago.",
        });
      } finally {
        setConfirming(false);
      }
    }

    confirmPayment();
  }, [intent, paymentId, result, preferenceId, merchantOrderId]);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Mercado Pago
        </p>

        <h1 className="mt-3 text-3xl font-black">{title}</h1>

        <p className="mt-3 text-sm font-bold text-zinc-500">
          {confirming
            ? "Estamos validando el pago con Mercado Pago."
            : confirmResult?.ok
            ? "El pago fue validado correctamente."
            : confirmResult?.error ||
              confirmResult?.message ||
              "El pago todavía no quedó aprobado."}
        </p>

        {confirmResult?.ok && confirmResult.result?.type === "order" && (
          <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-emerald-800">
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              Pedido creado
            </p>
            <p className="mt-2 text-4xl font-black">
              #{confirmResult.result.orderNumber}
            </p>
            <p className="mt-2 text-sm font-bold">
              Tu pedido fue enviado a cocina.
            </p>
          </div>
        )}

        {confirmResult?.ok &&
          confirmResult.result?.type === "company_wallet_recharge" && (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-emerald-800">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Recarga aprobada
              </p>
              <p className="mt-2 text-4xl font-black">
                {formatPrice(confirmResult.result.amount)}
              </p>
              <p className="mt-2 text-sm font-bold">
                Nuevo saldo: {formatPrice(confirmResult.result.balanceAfter)}
              </p>
            </div>
          )}

        <section className="mt-6 rounded-3xl bg-zinc-50 p-5">
          <h2 className="text-lg font-black">Datos recibidos</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Intent</span>
              <span className="font-bold">{formatValue(intent)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Flujo</span>
              <span className="font-bold">{formatValue(detectedFlow)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Resultado URL</span>
              <span className="font-bold">{formatValue(result)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Payment ID</span>
              <span className="font-bold">{formatValue(paymentId)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Preference ID</span>
              <span className="font-bold">{formatValue(preferenceId)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Estado validado</span>
              <span className="font-bold">
                {formatValue(confirmResult?.status)}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={backHref}
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
          >
            {backLabel}
          </a>
        </div>
      </div>
    </main>
  );
}
