"use client";

import { useEffect, useState } from "react";

type BankSettings = {
  businessName?: string;
  rut?: string;
  bank?: string;
  accountType?: string;
  accountNumber?: string;
  email?: string;
};

type Props = {
  open: boolean;
  orderNumber: number | null;
  onClose: () => void;
};

export default function CompanyTransferOrderSuccessModal({
  open,
  orderNumber,
  onClose,
}: Props) {
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);

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

        setBankSettings(data.settings || data || null);
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
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-7 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Pedido enviado a cocina
        </p>

        <h2 className="mt-3 text-4xl font-black text-zinc-950">
          Pedido #{orderNumber || ""}
        </h2>

        <p className="mt-4 text-lg font-bold leading-relaxed text-zinc-700">
          Como seleccionaste <strong>Transferencia</strong>, debes realizar el pago
          a la siguiente cuenta bancaria.
        </p>

        <div className="mt-6 rounded-3xl bg-zinc-50 p-5 text-left">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Datos de transferencia
          </p>

          <div className="mt-4 grid gap-3 text-sm font-bold text-zinc-700">
            <p>
              <span className="font-black text-zinc-950">Nombre:</span>{" "}
              {bankSettings?.businessName || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">RUT:</span>{" "}
              {bankSettings?.rut || "No configurado"}
            </p>

            <p>
              <span className="font-black text-zinc-950">Banco:</span>{" "}
              {bankSettings?.bank || "No configurado"}
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

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#10B557] py-5 text-xl font-black text-white shadow-lg active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
