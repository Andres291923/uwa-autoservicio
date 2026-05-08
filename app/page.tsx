export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-8 rounded-full bg-[#10B557] px-6 py-3 text-sm font-bold uppercase tracking-[0.25em] text-white">
          ÜWA Autoservicio
        </div>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight text-zinc-950 md:text-7xl">
          Arma tu bowl
          <span className="block text-[#10B557]">rápido y fácil</span>
        </h1>

        <p className="mt-6 max-w-2xl text-xl font-medium text-zinc-600">
          Sistema de autoservicio para pedidos en tótem, cocina y administración
          de productos ÜWA.
        </p>

        <div className="mt-12 grid w-full max-w-4xl gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B557] text-3xl text-white">
              🥗
            </div>
            <h2 className="text-xl font-black">Tótem</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Pantalla para que el cliente arme su bowl y confirme el pedido.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B557] text-3xl text-white">
              👨‍🍳
            </div>
            <h2 className="text-xl font-black">Cocina</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Pantalla donde llegan los pedidos para preparar y entregar.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B557] text-3xl text-white">
              📊
            </div>
            <h2 className="text-xl font-black">Admin</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Panel para crear productos, precios, modificadores y reportes.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <button className="rounded-2xl bg-[#10B557] px-8 py-4 text-lg font-black text-white shadow-lg shadow-green-200 transition hover:scale-105">
            Comenzar pedido
          </button>

          <button className="rounded-2xl border border-zinc-300 bg-white px-8 py-4 text-lg font-black text-zinc-900 transition hover:bg-zinc-50">
            Panel administrador
          </button>
        </div>

        <p className="mt-10 text-sm font-semibold text-zinc-400">
          MVP local funcionando en http://localhost:3000
        </p>
      </section>
    </main>
  );
}