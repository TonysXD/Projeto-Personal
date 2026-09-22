import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { capitalizeName, formatDateBR } from "@/lib/format";
import NextClassesPanel, { type PanelItem } from "@/components/NextClassesPanel";

/* ============================================================
   Helpers de data no fuso do Brasil (America/Sao_Paulo)
   ============================================================ */

function todayBR(): string {
  const br = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return `${br.getFullYear()}-${String(br.getMonth() + 1).padStart(2, "0")}-${String(br.getDate()).padStart(2, "0")}`;
}

function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return fmtISO(d);
}

function weekRangeBR() {
  const br = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const day = br.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(br);
  monday.setDate(br.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: fmtISO(d),
      weekday: d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }),
      dayNum: String(d.getDate()).padStart(2, "0"),
    };
  });

  return { start: fmtISO(monday), end: fmtISO(sunday), days };
}

function formatTimeBR(time: string | null | undefined) {
  return time?.slice(0, 5) ?? "--:--";
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  agendado: { label: "Agendado", cls: "bg-blue-100 text-blue-800" },
  reagendado: { label: "Reagendado", cls: "bg-amber-100 text-amber-800" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
  concluido: { label: "Concluído", cls: "bg-green-100 text-green-800" },
};

/* ============================================================
   Tipos
   ============================================================ */

type StudentSummary = {
  id: string;
  name: string;
  photo_url: string | null;
  goal: string | null;
  plan_name: string | null;
};

type SlotRow = {
  id: string;
  student_id: string;
  weekday: number; // 0 = domingo ... 6 = sábado
  start_time: string;
  end_time: string;
  active: boolean;
};

type AppointmentRow = {
  id: string;
  student_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  active: boolean;
};

type MergedClass = {
  key: string;
  kind: "fixa" | "avulsa";
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

/* ============================================================
   Página do Painel
   ============================================================ */

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = todayBR();
  const week = weekRangeBR();

  const [{ data: students }, { data: slots }, { data: appointments }, { data: payments }] =
    await Promise.all([
      supabase.from("students").select("id, status"),
      supabase.from("schedule_slots").select("id, student_id, weekday, start_time, end_time, active"),
      supabase
        .from("appointments")
        .select("id, student_id, appointment_date, start_time, end_time, status, active")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase.from("payments").select("id, status, due_date, amount, paid_at"),
    ]);

  const slotRows = (slots ?? []) as SlotRow[];
  const appointmentRows = (appointments ?? []) as AppointmentRow[];

  // ===== Contadores =====
  const totalStudents = (students ?? []).length;
  const activeStudents = (students ?? []).filter((s) => s.status === "ativo").length;

  const activeSlots = slotRows.filter((s) => s.active).length;

  const activeAppointments = appointmentRows.filter(
    (a) => a.status !== "cancelado" && a.status !== "concluido" && a.active !== false
  );

  const scheduledClasses = activeSlots + activeAppointments.length;

  /* ============================================================
     MATERIALIZAÇÃO: transforma horários fixos (weekday) em
     datas concretas (dia da semana + dia do mês) para os
     próximos 28 dias — e une tudo em uma lista ordenada.
     ============================================================ */
  const rangeEnd = addDaysISO(today, 27);
  const merged: MergedClass[] = [];

  // Aulas avulsas
  for (const a of activeAppointments) {
    merged.push({
      key: `app-${a.id}`,
      kind: "avulsa",
      student_id: a.student_id,
      date: a.appointment_date,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
    });
  }

  // Aulas fixas — uma ocorrência para cada data cujo dia da semana bate
  for (const s of slotRows) {
    if (!s.active) continue;
    const d = new Date(today + "T12:00:00");
    const end = new Date(rangeEnd + "T12:00:00");
    while (d <= end) {
      if (d.getDay() === s.weekday) {
        merged.push({
          key: `slot-${s.id}-${fmtISO(d)}`,
          kind: "fixa",
          student_id: s.student_id,
          date: fmtISO(d),
          start_time: s.start_time,
          end_time: s.end_time,
          status: "agendado",
        });
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // Ordena por data e horário
  merged.sort((x, y) =>
    x.date === y.date ? x.start_time.localeCompare(y.start_time) : x.date.localeCompare(y.date)
  );

  // ===== Próximas aulas (painel interativo) =====
  const nextClasses = merged;

  // ===== Aulas da semana =====
  const weekClasses = merged.filter(
    (m) => m.date >= week.start && m.date <= week.end
  );

  // ===== Dados dos alunos envolvidos =====
  const involvedIds = [...new Set(merged.map((m) => m.student_id))];
  const { data: involvedStudents } = involvedIds.length
    ? await supabase
        .from("students")
        .select("id, name, photo_url, goal, plan_name")
        .in("id", involvedIds)
    : { data: [] };

  const studentById = new Map<string, StudentSummary>(
    (involvedStudents ?? []).map((s) => [s.id, s as StudentSummary])
  );

  // ===== Financeiro =====
  let toReceive = 0;
  let overdue = 0;
  let overdueCount = 0;
  const month = today.slice(0, 7);

  for (const p of payments ?? []) {
    if (p.status === "cancelado") continue;
    const isPaid = p.status === "pago";
    const isOverdue = !isPaid && p.due_date < today;
    if (!isPaid) toReceive += Number(p.amount ?? 0);
    if (isOverdue) {
      overdue += Number(p.amount ?? 0);
      overdueCount++;
    }
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
      sub: `${activeSlots} fixas + ${activeAppointments.length} avulsas`,
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

  // Prepara os itens do painel interativo (com dados do aluno já juntados)
  const panelItems: PanelItem[] = nextClasses.map((m) => ({
    key: m.key,
    kind: m.kind,
    date: m.date,
    start_time: m.start_time,
    end_time: m.end_time,
    status: m.status,
    student: studentById.get(m.student_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Painel</h1>

      {/* ===== Cards de resumo ===== */}
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

      {/* ===== PRÓXIMAS AULAS (interativo, com setas) ===== */}
      <NextClassesPanel items={panelItems} />

      {/* ===== AULAS DA SEMANA ===== */}
      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-6 py-4">
          <h2 className="text-sm font-bold text-neutral-900">Aulas da semana</h2>
          <p className="text-xs text-neutral-500">
            {week.days[0].weekday}, {week.days[0].dayNum} — {week.days[6].weekday}, {week.days[6].dayNum}
          </p>
        </div>

        {weekClasses.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-neutral-500">
            Nenhuma aula nesta semana.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {week.days.map((day) => {
              const dayClasses = weekClasses.filter((m) => m.date === day.date);
              if (dayClasses.length === 0) return null;

              return (
                <div key={day.date} className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        day.date === today
                          ? "bg-red-600 text-white"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {day.weekday} · {day.dayNum}
                    </span>
                    {day.date === today && (
                      <span className="text-xs font-semibold text-red-600">Hoje</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayClasses.map((m) => {
                      const student = studentById.get(m.student_id);
                      const status = STATUS_META[m.status] ?? STATUS_META.agendado;
                      return (
                        <div
                          key={m.key}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
                        >
                          {student?.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.photo_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-500">
                              {(student?.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral-900">
                              {capitalizeName(student?.name ?? "Aluno")}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatTimeBR(m.start_time)} – {formatTimeBR(m.end_time)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              m.kind === "fixa"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {m.kind === "fixa" ? "Fixa" : "Avulsa"}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}