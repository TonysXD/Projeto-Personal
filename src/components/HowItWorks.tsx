const steps = [
  {
    step: "1",
    title: "Agende",
    description: "Preencha o formulário e escolha o melhor horário.",
  },
  {
    step: "2",
    title: "Avalie",
    description: "Faça a avaliação física gratuita na primeira aula.",
  },
  {
    step: "3",
    title: "Monte o plano",
    description: "Receba seu plano individual e comece a treinar.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-neutral-900">
          Como funciona
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <span className="text-3xl font-bold text-red-600">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-2 text-neutral-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}