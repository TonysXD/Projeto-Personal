import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: students }, { data: payments }, { data: appointments }] =
    await Promise.all([
      supabase.from("students").select("id, name, whatsapp, status, created_at"),
      supabase.from("payments").select("id, status, amount"),
      supabase.from("appointments").select("id, date, status"),
    ]);

  const total = students?.length ?? 0;
  const active = students?.filter((s) => s.status === "ativo").length ?? 0;
  const pending =
    payments?.filter((p) => p.status === "pendente" || p.status === "atrasado") ?? [];
  const pendingTotal = pending.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount =
    appointments?.filter((a) => a.date === today && a.status === "agendado").length ?? 0;

  const recent = students ?? [];

  const cards = [
    { label: "Alunos ativos", value: active, sub: `${total} no total` },
    {
      label: "Pagamentos pendentes",
      value: pending.length,
      sub: `R$ ${pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    { label: "Aulas hoje", value: todayCount, sub: "agendadas" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Visão geral</h1>
        <Link
          href="/admin/students/new"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          + Novo aluno
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-neutral-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-neutral-900">{card.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          Últimos alunos cadastrados
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-neutral-500">
            Nenhum aluno cadastrado ainda. Clique em "+ Novo aluno" para começar.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-neutral-900">{s.name}</p>
                  <p className="text-sm text-neutral-500">
                    {s.whatsapp ?? "Sem WhatsApp"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    s.status === "ativo"
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}