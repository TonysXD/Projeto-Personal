const items = [
  {
    problem: "Não tem tempo para treinar",
    solution: "Treinos de 45 minutos, planejados para a sua rotina.",
  },
  {
    problem: "Não vê resultado treinando sozinho",
    solution: "Plano individual com metas e evolução medida a cada semana.",
  },
  {
    problem: "Treina errado e sente dores",
    solution: "Correção de movimento e acompanhamento de perto em cada série.",
  },
];

export default function Problems() {
  return (
    <section id="problemas" className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-white">
          Você se identifica com algum desses problemas?
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.problem} className="rounded-xl bg-neutral-900 p-6">
              <h3 className="text-lg font-semibold text-white">{item.problem}</h3>
              <p className="mt-2 text-neutral-300">{item.solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}