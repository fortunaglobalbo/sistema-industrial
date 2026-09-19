"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="p-12">
      <h1 className="text-2xl font-semibold">
        No pudimos cargar el espacio médico
      </h1>
      <p className="my-4">Comprueba tu conexión e intenta nuevamente.</p>
      <button onClick={reset} className="rounded-xl bg-teal-800 text-white p-3">
        Volver a intentar
      </button>
    </main>
  );
}
