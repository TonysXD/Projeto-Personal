export default function Hero() {
  return (
    <section id="inicio" className="bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-20 md:flex-row md:py-28">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Em 12 semanas no seu melhor shape, com treino presencial e
            acompanhamento de perto
          </h1>
          <p className="mt-4 text-lg text-neutral-300">
            Atendimento a domicílio ou em estúdio na Zona Sul. Avaliação física
            gratuita na primeira aula.
          </p>
          <a
            href="#lead"
            className="mt-8 inline-block rounded-lg bg-red-600 px-8 py-4 text-lg font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98]"
          >
            Quero a aula experimental grátis
          </a>
          <p className="mt-3 text-sm text-neutral-400">
            Sem compromisso · Resposta em até 2 horas
          </p>
        </div>
        <div className="flex-1">
          <img
            src="/hero.png"
            alt="Personal trainer orientando aluno durante treino na academia"
            className="w-full rounded-2xl object-cover"
          />
        </div>
      </div>
    </section>
  );
}