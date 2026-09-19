const stats = [
  { value: "300+", label: "alunos atendidos" },
  { value: "8 anos", label: "de experiência" },
  { value: "5,0", label: "nota no Google" },
];

export default function SocialProof() {
  return (
    <section className="border-y border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-12 text-center sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-4xl font-bold text-red-600">{stat.value}</p>
            <p className="mt-1 text-neutral-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}