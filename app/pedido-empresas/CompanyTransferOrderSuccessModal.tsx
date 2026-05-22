"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BankInfo = {
  holderName: string;
  rut: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  email: string;
  notes: string;
};

type Props = {
  open: boolean;
  orderNumber: number | null;
  onClose: () => void;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-zinc-950">{value}</p>
    </div>
  );
}

export default function CompanyTransferOrderSuccessModal({
  open,
  orderNumber,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [bank, setBank] = useState<BankInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    async function loadBank() {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetch("/api/company-bank-settings/public", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "No se pudieron cargar los datos bancarios.");
          return;
        }

        if (!data.configured) {
          setBank(null);
          setMessage("Los datos bancarios aún no han sido configurados.");
          return;
        }

        setBank(data.bank);
      } catch (error) {
        console.error(error);
        setMessage("Error al cargar datos bancarios.");
      } finally {
        setLoading(false);
      }
    }

    loadBank();
  }, [open]);

  if (!mounted || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex: 999999 }}
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Pedido enviado
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Pedido N° {String(orderNumber || "").padStart(3, "0")} fue enviado a cocina
            </h2>

            <p className="mt-2 text-sm font-bold text-zinc-500">
              Como seleccionaste transferencia, necesitamos validar el comprobante antes de autorizar el armado de bowls.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
          >
            Cerrar
          </button>
        </div>

        <div className="rounded-3xl bg-yellow-50 p-5">
          <p className="text-xl font-black text-yellow-900">
            Favor realiza la transferencia y envía el comprobante.
          </p>

          <p className="mt-2 text-sm font-bold text-yellow-800">
            El pedido ya fue enviado a cocina, pero el armado de bowls queda sujeto a validación del comprobante.
          </p>
        </div>

        {loading ? (
          <div className="mt-5 rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-500">
            Cargando datos bancarios...
          </div>
        ) : message ? (
          <div className="mt-5 rounded-3xl bg-zinc-50 p-8 text-center font-black text-zinc-600">
            {message}
          </div>
        ) : bank ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Titular" value={bank.holderName} />
              <InfoRow label="RUT" value={bank.rut} />
              <InfoRow label="Banco" value={bank.bankName} />
              <InfoRow label="Tipo de cuenta" value={bank.accountType} />
              <InfoRow label="Número de cuenta" value={bank.accountNumber} />
              <InfoRow label="Correo comprobante" value={bank.email} />
            </div>

            {bank.notes && (
              <div className="mt-4 rounded-3xl bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase text-emerald-700">
                  Instrucciones
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-700">
                  {bank.notes}
                </p>
              </div>
            )}

            <p className="mt-5 rounded-3xl bg-zinc-950 p-5 text-sm font-black text-white">
              Envía el comprobante al correo indicado para validar la carga de saldo o autorizar el armado de bowls.
            </p>
          </>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#10B557] px-5 py-4 text-sm font-black text-white"
        >
          Entendido
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
