import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: slots }, { data: appointments }, { data: payments }] =
    await Promise.all([
      supabase.from("students").select("id, status"),
      supabase.from("schedule_slots").select("id, active"),
      supabase
        .from("appointments")
        .select("id, appointment_date, active, status")
        .gte("appointment_date", today),
      supabase.from("payments").select("id, status, due_date, amount, paid_at"),
    ]);

  const totalStudents = (students ?? []).length;
  const activeStudents = (students ?? []).filter((s) => s.status === "ativo").length;

  // ===== AULAS AGENDADAS (o contador corrigido) =====
  const activeSlots = (slots ?? []).filter((s) => s.active).length;
  const upcomingAppointments = (appointments ?? []).filter(
    (a) => a.active && a.status !== "cancelado"
  ).length;
  const scheduledClasses = activeSlots + upcomingAppointments;

  let toReceive = 0;
  let overdue = 0;
  let overdueCount = 0;
  let paidThisMonth = 0;
  const month = today.slice(0, 7);

  for (const p of payments ?? []) {
    const isPaid = p.status === "pago";
    const isOverdue = !isPaid && p.due_date < today;
    if (!isPaid) toReceive += Number(p.amount ?? 0);
    if (isOverdue) {
      overdue += Number(p.amount ?? 0);
      overdueCount++;
    }
    if (isPaid && p.paid_at?.startsWith(month)) paidThisMonth += Number(p.amount ?? 0);
  }

  const money = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const cards = [
    {
      label: "Alunos ativos",
      value: String(activeStudents),
      sub: `${totalStudents} no total`,
      href: "/admin/students",
      color: "text-neutral-900",
    },
    {
      label: "Aulas agendadas",
      value: String(scheduledClasses),
      sub: `${activeSlots} fixas + ${upcomingAppointments} avulsas`,
      href: "/admin/appointments",
      color: "text-red-600",
    },
    {
      label: "A receber",
      value: money(toReceive),
      sub: "pendentes e atrasados",
      href: "/admin/payments",
      color: "text-neutral-900",
    },
    {
      label: "Atrasados",
      value: money(overdue),
      sub: `${overdueCount} cobrança(s) vencida(s)`,
      href: "/admin/payments",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Painel</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{c.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}