export default function AdminPage() {
  return (
    <main className="min-h-screen bg-white p-8 text-zinc-900">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#10B557]">
            Panel Admin
          </p>
          <h1 className="mt-2 text-5xl font-black">Administración ÜWA</h1>
        </div>

        <a
          href="/"
          className="rounded-xl border border-zinc-300 px-5 py-3 font-bold"
        >
          Volver
        </a>
      </header>

      <section className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-[#10B557] p-6 text-white shadow-sm">
          <p className="text-sm font-black uppercase opacity-80">Productos</p>
          <h2 className="mt-3 text-5xl font-black">3</h2>
          <p className="mt-2 font-semibold">Productos cargados</p>
        </div>

        <div className="rounded-3xl bg-[#10B557] p-6 text-white shadow-sm">
          <p className="text-sm font-black uppercase opacity-80">Pedidos</p>
          <h2 className="mt-3 text-5xl font-black">2</h2>
          <p className="mt-2 font-semibold">Pedidos de prueba</p>
        </div>

        <div className="rounded-3xl bg-[#10B557] p-6 text-white shadow-sm">
          <p className="text-sm font-black uppercase opacity-80">Ventas</p>
          <h2 className="mt-3 text-5xl font-black">$8.600</h2>
          <p className="mt-2 font-semibold">Venta simulada</p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-black">Productos</h2>

          <button className="rounded-2xl bg-[#10B557] px-6 py-3 font-black text-white">
            Crear producto
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-left">
            <thead className="bg-zinc-100">
              <tr>
                <th className="p-4 font-black">Producto</th>
                <th className="p-4 font-black">Categoría</th>
                <th className="p-4 font-black">Precio</th>
                <th className="p-4 font-black">Estado</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-zinc-200">
                <td className="p-4 font-bold">Bowl M Pollo</td>
                <td className="p-4">Bowls</td>
                <td className="p-4 font-black text-[#10B557]">$4.200</td>
                <td className="p-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                    Activo
                  </span>
                </td>
              </tr>

              <tr className="border-t border-zinc-200">
                <td className="p-4 font-bold">Bowl M Carne</td>
                <td className="p-4">Bowls</td>
                <td className="p-4 font-black text-[#10B557]">$4.400</td>
                <td className="p-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                    Activo
                  </span>
                </td>
              </tr>

              <tr className="border-t border-zinc-200">
                <td className="p-4 font-bold">Jumex Mango</td>
                <td className="p-4">Bebidas</td>
                <td className="p-4 font-black text-[#10B557]">$1.500</td>
                <td className="p-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                    Activo
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}