const testimonials = [
  {
    name: "Mariana S.",
    result: "Perdi 8kg em 4 meses",
    text: "Treino a domicílio e finalmente consigo manter uma rotina. O acompanhamento faz toda a diferença.",
  },
  {
    name: "Carlos A.",
    result: "Ganhou 5kg de massa magra",
    text: "Tentei treinar sozinho por anos. Com o plano individual, vi resultado no primeiro mês.",
  },
];

export default function Testimonials() {
  return (
    <section id="resultados" className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-white">
          Resultados reais
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="rounded-xl bg-neutral-900 p-6">
              <p className="font-semibold text-red-400">{t.result}</p>
              <p className="mt-2 text-neutral-200">"{t.text}"</p>
              <footer className="mt-4 text-sm font-medium text-neutral-400">
                — {t.name}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}