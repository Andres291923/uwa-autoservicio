export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
      <section className="mx-auto mt-20 max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
          Acceso restringido
        </p>

        <h1 className="mt-3 text-4xl font-black">No tienes permiso</h1>

        <p className="mt-3 text-sm font-bold text-zinc-500">
          Tu usuario no tiene acceso a este modulo.
        </p>

        <a
          href="/admin"
          className="mt-6 inline-flex rounded-2xl bg-[#10B557] px-6 py-3 text-sm font-black text-white"
        >
          Volver
        </a>
      </section>
    </main>
  );
}
