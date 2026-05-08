export default function TotemPage() {
  return (
    <main className="min-h-screen bg-white p-8 text-zinc-900">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            ÜWA Autoservicio
          </p>
          <h1 className="mt-2 text-5xl font-black">Arma tu bowl</h1>
        </div>

        <a
          href="/"
          className="rounded-xl border border-zinc-300 px-5 py-3 font-bold"
        >
          Volver
        </a>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <div className="mb-5 flex h-40 items-center justify-center rounded-2xl bg-zinc-100 text-6xl">
            🥗
          </div>
          <h2 className="text-2xl font-black">Bowl M Pollo</h2>
          <p className="mt-2 text-zinc-600">
            Base + verduras + proteína + salsas.
          </p>
          <p className="mt-4 text-3xl font-black text-[#10B557]">$4.200</p>

          <button className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white">
            Elegir
          </button>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <div className="mb-5 flex h-40 items-center justify-center rounded-2xl bg-zinc-100 text-6xl">
            🥩
          </div>
          <h2 className="text-2xl font-black">Bowl M Carne</h2>
          <p className="mt-2 text-zinc-600">
            Base + verduras + proteína + salsas.
          </p>
          <p className="mt-4 text-3xl font-black text-[#10B557]">$4.400</p>

          <button className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white">
            Elegir
          </button>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <div className="mb-5 flex h-40 items-center justify-center rounded-2xl bg-zinc-100 text-6xl">
            🧃
          </div>
          <h2 className="text-2xl font-black">Jumex Mango</h2>
          <p className="mt-2 text-zinc-600">Bebida individual.</p>
          <p className="mt-4 text-3xl font-black text-[#10B557]">$1.500</p>

          <button className="mt-6 w-full rounded-2xl bg-[#10B557] py-4 text-lg font-black text-white">
            Agregar
          </button>
        </div>
      </section>
    </main>
  );
}