type ReturnPageProps = {
  searchParams: Promise<{
    intent?: string;
    result?: string;
    payment_id?: string;
    status?: string;
    merchant_order_id?: string;
    preference_id?: string;
    external_reference?: string;
  }>;
};

function formatValue(value: string | undefined) {
  return value && value.trim() ? value : "No recibido";
}

export default async function MercadoPagoReturnPage({
  searchParams,
}: ReturnPageProps) {
  const params = await searchParams;

  const result = params.result || params.status || "pending";

  const isSuccess = result === "success" || result === "approved";
  const isFailure = result === "failure" || result === "rejected";

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
          Mercado Pago
        </p>

        <h1 className="mt-3 text-3xl font-black">
          {isSuccess
            ? "Pago recibido"
            : isFailure
            ? "Pago no aprobado"
            : "Pago pendiente de confirmación"}
        </h1>

        <p className="mt-3 text-sm font-bold text-zinc-500">
          Esta pantalla confirma que Mercado Pago volvió al sistema. El próximo
          paso será validar el pago contra Mercado Pago y recién ahí crear el
          pedido real en cocina.
        </p>

        <section className="mt-6 rounded-3xl bg-zinc-50 p-5">
          <h2 className="text-lg font-black">Datos recibidos</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Intent</span>
              <span className="font-bold">{formatValue(params.intent || params.external_reference)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Resultado</span>
              <span className="font-bold">{formatValue(result)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Payment ID</span>
              <span className="font-bold">{formatValue(params.payment_id)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Preference ID</span>
              <span className="font-bold">{formatValue(params.preference_id)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-black text-zinc-500">Merchant Order</span>
              <span className="font-bold">{formatValue(params.merchant_order_id)}</span>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
          Todavía no se envía a cocina desde aquí. Falta conectar la validación
          final del pago aprobado.
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/pedido"
            className="rounded-2xl bg-[#10B557] px-5 py-3 text-sm font-black text-white"
          >
            Volver a pedido online
          </a>

          <a
            href="/admin/settings/mercadopago"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black"
          >
            Configuración Mercado Pago
          </a>
        </div>
      </div>
    </main>
  );
}
