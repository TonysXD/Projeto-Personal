"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";

const PIX_KEY = "anthonio.fon@gmail.com";

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

type Payment = {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
  method: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

type Student = {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
  plan_name: string | null;
  plan_price: number | null;
  plan_end: string | null;
};

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    atrasado: { label: "Atrasado", cls: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? map.pendente;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function PaymentsClient({
  initialPayments,
  students,
}: {
  initialPayments: Payment[];
  students: Student[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [filter, setFilter] = useState<"todos" | "pendente" | "atrasado" | "pago">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    due_date: todayISO(),
    amount: "",
    method: "pix",
    notes: "",
    alreadyPaid: false,
  });

  const today = todayISO();

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  function displayStatus(p: Payment) {
    if (p.status === "pago") return "pago";
    return p.due_date < today ? "atrasado" : "pendente";
  }

  const kpis = useMemo(() => {
    let aReceber = 0;
    let atrasados = 0;
    let atrasadosCount = 0;
    let pagosMes = 0;
    let proximos = 0;
    const month = today.slice(0, 7);

    for (const p of payments) {
      const st = displayStatus(p);
      if (st === "pendente" || st === "atrasado") aReceber += p.amount;
      if (st === "atrasado") {
        atrasados += p.amount;
        atrasadosCount++;
      }
      if (p.status === "pago" && p.paid_at?.startsWith(month)) pagosMes += p.amount;
      if (st !== "pago" && p.due_date >= today && p.due_date <= addDays(today, 7)) proximos++;
    }
    return { aReceber, atrasados, atrasadosCount, pagosMes, proximos };
  }, [payments, today]);

  const filtered = payments.filter((p) => {
    if (filter === "todos") return true;
    return displayStatus(p) === filter;
  });

  async function markPaid(p: Payment) {
    setBusyId(p.id);
    const { data, error: err } = await supabase
      .from("payments")
      .update({ status: "pago", paid_at: today })
      .eq("id", p.id)
      .select()
      .single();
    if (!err && data) {
      setPayments((prev) => prev.map((x) => (x.id === p.id ? data : x)));
    } else {
      setError("Não foi possível atualizar: " + (err?.message ?? "erro desconhecido"));
    }
    setBusyId(null);
    router.refresh();
  }

  async function reopen(p: Payment) {
    setBusyId(p.id);
    const { data, error: err } = await supabase
      .from("payments")
      .update({ status: "pendente", paid_at: null })
      .eq("id", p.id)
      .select()
      .single();
    if (!err && data) {
      setPayments((prev) => prev.map((x) => (x.id === p.id ? data : x)));
    } else {
      setError("Não foi possível reabrir: " + (err?.message ?? "erro desconhecido"));
    }
    setBusyId(null);
    router.refresh();
  }

  async function removePayment(p: Payment) {
    const name = studentsById.get(p.student_id)?.name ?? "aluno";
    if (!confirm(`Excluir esta cobrança de ${name}?`)) return;
    setBusyId(p.id);
    const { error: err } = await supabase.from("payments").delete().eq("id", p.id);
    if (!err) {
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      setError("Não foi possível excluir: " + (err?.message ?? "erro desconhecido"));
    }
    setBusyId(null);
    router.refresh();
  }

  async function copyPix(p: Payment) {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Não foi possível copiar. Copie manualmente: " + PIX_KEY);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.student_id || !amount || amount <= 0) {
      setError("Selecione o aluno e informe um valor válido.");
      return;
    }
    setGenerating(true);
    const { data, error: err } = await supabase
      .from("payments")
      .insert({
        student_id: form.student_id,
        due_date: form.due_date,
        amount,
        method: form.method,
        status: form.alreadyPaid ? "pago" : "pendente",
        paid_at: form.alreadyPaid ? today : null,
        notes: form.notes || null,
      })
      .select()
      .single();
    if (!err && data) {
      setPayments((prev) => [data, ...prev]);
      setModalOpen(false);
      setForm({
        student_id: "",
        due_date: todayISO(),
        amount: "",
        method: "pix",
        notes: "",
        alreadyPaid: false,
      });
    } else {
      // Mostra o erro REAL do banco para diagnóstico
      setError("Não foi possível registrar: " + (err?.message ?? "erro desconhecido"));
    }
    setGenerating(false);
    router.refresh();
  }

  async function generateMonthly() {
    setGenerating(true);
    setError(null);
    const month = today.slice(0, 7);
    const active = students.filter((s) => s.status === "ativo");
    const existingStudentIds = new Set(
      payments.filter((p) => p.due_date.startsWith(month)).map((p) => p.student_id)
    );
    const toCreate = active.filter((s) => !existingStudentIds.has(s.id));

    if (toCreate.length === 0) {
      setError("Todos os alunos ativos já têm cobrança neste mês.");
      setGenerating(false);
      return;
    }

    const rows = toCreate.map((s) => ({
      student_id: s.id,
      due_date: s.plan_end && s.plan_end >= today ? s.plan_end : today,
      amount: s.plan_price ?? 0,
      method: "pix", // <- corrigido: método padrão PIX
      status: "pendente",
    }));

    const { data, error: err } = await supabase.from("payments").insert(rows).select();
    if (!err && data) {
      setPayments((prev) => [...data, ...prev]);
    } else {
      setError("Não foi possível gerar as cobranças: " + (err?.message ?? "erro desconhecido"));
    }
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Pagamentos</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generateMonthly}
            disabled={generating}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            {generating ? "Gerando..." : "Gerar cobranças do mês"}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            + Registrar pagamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">A receber</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{formatMoney(kpis.aReceber)}</p>
          <p className="mt-1 text-xs text-neutral-500">pendentes e atrasados</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Atrasados</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatMoney(kpis.atrasados)}</p>
          <p className="mt-1 text-xs text-neutral-500">{kpis.atrasadosCount} cobrança(s) vencida(s)</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Pagos no mês</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatMoney(kpis.pagosMes)}</p>
          <p className="mt-1 text-xs text-neutral-500">recebido em {formatDateBR(today)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Vencem em 7 dias</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{kpis.proximos}</p>
          <p className="mt-1 text-xs text-neutral-500">cobrança(s) a vencer</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        {(["todos", "pendente", "atrasado", "pago"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "border-red-600 text-red-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Forma</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length ? (
              filtered.map((p) => {
                const student = studentsById.get(p.student_id);
                const st = displayStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student?.photo_url ? (
                          <img src={student.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-500">
                            {student?.name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-neutral-900">{student?.name ?? "Aluno removido"}</p>
                          {p.notes && <p className="text-xs text-neutral-400">{p.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDateBR(p.due_date)}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {METHOD_LABELS[p.method ?? ""] ?? p.method ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={st} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {st !== "pago" ? (
                          <button
                            onClick={() => markPaid(p)}
                            disabled={busyId === p.id}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            Marcar pago
                          </button>
                        ) : (
                          <button
                            onClick={() => reopen(p)}
                            disabled={busyId === p.id}
                            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                        <button
                          onClick={() => copyPix(p)}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          {copiedId === p.id ? "Copiado!" : "PIX"}
                        </button>
                        <button
                          onClick={() => removePayment(p)}
                          disabled={busyId === p.id}
                          aria-label="Excluir cobrança"
                          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  Nenhuma cobrança encontrada. Use "Gerar cobranças do mês" ou "Registrar pagamento".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de registro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleRegister}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-neutral-900">Registrar pagamento</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="pay-student" className={labelClasses}>Aluno *</label>
                <select
                  id="pay-student"
                  className={inputClasses}
                  value={form.student_id}
                  onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status !== "ativo" ? "(inativo)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-due" className={labelClasses}>Vencimento *</label>
                  <input
                    id="pay-due"
                    type="date"
                    className={inputClasses}
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="pay-amount" className={labelClasses}>Valor (R$) *</label>
                  <input
                    id="pay-amount"
                    className={inputClasses}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="ex.: 350"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pay-method" className={labelClasses}>Forma de pagamento</label>
                <select
                  id="pay-method"
                  className={inputClasses}
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>

              <div>
                <label htmlFor="pay-notes" className={labelClasses}>Observações</label>
                <input
                  id="pay-notes"
                  className={inputClasses}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="opcional"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.alreadyPaid}
                  onChange={(e) => setForm((f) => ({ ...f, alreadyPaid: e.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                />
                Já foi pago (marca como pago hoje)
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={generating}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {generating ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}