"use client";

import { useEffect, useMemo, useState } from "react";

function formatPrice(value: number | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

type BankSettings = {
  businessName?: string;
  holderName?: string;
  rut?: string;
  bank?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  email?: string;
};

type OrderSummaryItem = {
  id: string | number;
  productName: string;
  total: number;
  modifiersText: string[];
  customerComment: string;
};

type Props = {
  open: boolean;
  orderNumber: number | null;
  orderTotal?: number | null;
  orderItems?: OrderSummaryItem[];
  onClose: () => void;
};

export default function CompanyTransferOrderSuccessModal({
  open,
  orderNumber,
  orderTotal,
  orderItems = [],
  onClose,
}: Props) {
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);

  const summaryTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [orderItems]);

  const displayTotal = Number(orderTotal || 0) > 0 ? Number(orderTotal) : summaryTotal;

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadBankSettings() {
      try {
        const response = await fetch("/api/company-bank-settings/public", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!active) return;

        const source = data.settings || data.bank || data || null;

        setBankSettings({
          businessName: source?.businessName || source?.holderName || "",
          holderName: source?.holderName || source?.businessName || "",
          rut: source?.rut || "",
          bank: source?.bank || source?.bankName || "",
          bankName: source?.bankName || source?.bank || "",
          accountType: source?.accountType || "",
          accountNumber: source?.accountNumber || "",
          email: source?.email || "",
        });
      } catch (error) {
        console.error(error);

        if (active) {
          setBankSettings(null);
        }
      }
    }

    loadBankSettings();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-7 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Pedido enviado a cocina
        </p>

        <h2 className="mt-3 text-4xl font-black text-zinc-950">
          Pedido #{orderNumber || ""}
        </h2>

        <div className="mx-auto mt-4 w-full max-w-md rounded-3xl bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Total a transferir
          </p>
          <p className="mt-2 text-4xl font-black text-emerald-700">
            {formatPrice(displayTotal)}
          </p>
        </div>

        {orderItems.length > 0 && (
          <div className="mt-5 rounded-3xl bg-zinc-50 p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              Resumen de compra
            </p>

            <div className="mt-4 space-y-4">
              {orderItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-black text-zinc-950">
                        1x {item.productName}
                      </p>

                      {item.customerComment && (
                        <p className="mt-1 text-sm font-bold text-orange-700">
                          {item.customerComment}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 text-base font-black text-[#10B557]">
                      {formatPrice(item.total)}
                    </p>
                  </div>

                  {item.modifiersText.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {item.modifiersText.map((text) => (
                        <p key={text} className="text-xs font-bold text-zinc-500">
                          {text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 text-lg font-bold leading-relaxed text-zinc-700">
          Como seleccionaste <strong>Transferencia</strong>, debes realizar el pago
          a la siguiente cuenta bancaria.
        </p>

        <div className="mt-5 rounded-3xl bg-zinc-50 p-5 text-left">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Datos de transferencia
          </p>

          <div className="mt-4 grid gap-3 text-sm font-bold text-zinc-700">
            <p>
              <span className="font-black text-zinc-950">Nombre:</span>{" "}
              {bankSettings?.businessName || bankSettings?.holderName || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">RUT:</span>{" "}
              {bankSettings?.rut || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">Banco:</span>{" "}
              {bankSettings?.bank || bankSettings?.bankName || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">Tipo de cuenta:</span>{" "}
              {bankSettings?.accountType || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">N° cuenta:</span>{" "}
              {bankSettings?.accountNumber || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">Correo:</span>{" "}
              {bankSettings?.email || "No configurado"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-orange-50 p-5 text-center">
          <p className="text-lg font-black text-orange-700">
            No se armarán los bowls hasta validar el pago.
          </p>
        </div>

        <div className="sticky bottom-0 -mx-7 -mb-7 mt-6 bg-white p-7 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[#10B557] py-5 text-xl font-black text-white shadow-lg active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
