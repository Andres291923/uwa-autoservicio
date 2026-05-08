export default function CocinaPage() {
  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            Cocina ÜWA
          </p>
          <h1 className="mt-2 text-5xl font-black">Pedidos en cocina</h1>
        </div>

        <a
          href="/"
          className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-bold"
        >
          Volver
        </a>
      </header>

      <section className="grid gap-5">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Pedido #001</h2>
            <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-700">
              Pendiente
            </span>
          </div>

          <div className="mt-5 space-y-2 text-lg">
            <p>
              <strong>Bowl M Pollo</strong>
            </p>
            <p>Base: Arroz</p>
            <p>Verduras: Lechuga, zanahoria, choclo, pepino</p>
            <p>Salsas: Verde, cilantro</p>
            <p className="font-black text-[#10B557]">Total: $4.200</p>
          </div>

          <button className="mt-6 rounded-2xl bg-[#10B557] px-8 py-4 font-black text-white">
            Marcar como listo
          </button>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm opacity-60">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Pedido #002</h2>
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
              Listo
            </span>
          </div>

          <div className="mt-5 space-y-2 text-lg">
            <p>
              <strong>Bowl M Carne</strong>
            </p>
            <p>Base: Lechuga</p>
            <p>Verduras: zanahoria, betarraga, choclo, brócoli</p>
            <p>Salsas: Verde</p>
            <p className="font-black text-[#10B557]">Total: $4.400</p>
          </div>
        </article>
      </section>
    </main>
  );
}