"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR, capitalizeName } from "@/lib/format";
import DateInput from "@/components/DateInput";

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

function formatMoney(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const inputClasses =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-red-600";
const labelClasses = "mb-1.5 block text-sm font-semibold text-neutral-800";

function StatusBadge({ status, dueDate }: { status: string; dueDate: string }) {
  const pago = status === "pago";
  const atrasado =
    !pago && dueDate && dueDate < todayISO();

  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
    atrasado: { label: "Atrasado", cls: "bg-red-100 text-red-800" },
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
  };

  const current = pago ? map.pago : atrasado ? map.atrasado : map.pendente;

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${current.cls}`}
    >
      {current.label}
    </span>
  );
}

const emptyForm = {
  student_id: "",
  due_date: "",
  amount: "",
  method: "",
  notes: "",
};

export default function PaymentsClient({
  initialPayments,
  students,
}: {
  initialPayments: Payment[];
  students: Student[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [filter, setFilter] = useState<"todos" | "pago" | "pendente" | "atrasado">("todos");
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, s.name);
    return map;
  }, [students]);

  const paymentStatus = (p: Payment): "pago" | "atrasado" | "pendente" => {
    if (p.status === "pago") return "pago";
    if (p.due_date < todayISO()) return "atrasado";
    return "pendente";
  };

  const filtered = useMemo(() => {
    if (filter === "todos") return payments;
    return payments.filter((p) => paymentStatus(p) === filter);
  }, [payments, filter]);

  const totals = useMemo(() => {
    let aReceber = 0;
    let pagos = 0;
    let atrasados = 0;
    let pendentes = 0;
    for (const p of payments) {
      const s = paymentStatus(p);
      if (s === "pago") pagos += p.amount;
      if (s === "atrasado") atrasados += p.amount;
      if (s === "pendente") pendentes += p.amount;
    }
    aReceber = atrasados + pendentes;
    return { aReceber, pagos, atrasados, pendentes };
  }, [payments]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function markAsPaid(payment: Payment) {
    const { error: err } = await supabase
      .from("payments")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (!err) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: "pago", paid_at: new Date().toISOString() }
            : p
        )
      );
      router.refresh();
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.student_id || !form.due_date || !form.amount) {
      setError("Aluno, vencimento e valor são obrigatórios.");
      return;
    }

    setSaving(true);

    const { error: err } = await supabase.from("payments").insert({
      student_id: form.student_id,
      due_date: form.due_date,
      amount: parseFloat(form.amount.replace(",", ".")),
      method: form.method || null,
      status: "pendente",
      notes: form.notes || null,
    });

    if (err) {
      setError("Não foi possível salvar o pagamento. Tente novamente.");
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setModalOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Pagamentos</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-red-700 active:scale-[0.98]"
        >
          + Novo pagamento
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Total pago</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatMoney(totals.pagos)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">A receber</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{formatMoney(totals.aReceber)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{formatMoney(totals.pendentes)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Atrasados</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{formatMoney(totals.atrasados)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(["todos", "pendente", "atrasado", "pago"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : f === "atrasado" ? "Atrasados" : "Pendentes"}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length ? (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/students/${p.student_id}`}
                      className="font-medium text-neutral-900 hover:text-red-600"
                    >
                      {capitalizeName(studentName.get(p.student_id)) || "Aluno removido"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDateBR(p.due_date)}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {p.method ? METHOD_LABELS[p.method] ?? p.method : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} dueDate={p.due_date} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "pago" ? (
                      <button
                        type="button"
                        onClick={() => markAsPaid(p)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                      >
                        Marcar como pago
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Nenhum pagamento {filter !== "todos" ? `com status "${filter}"` : ""} encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de novo pagamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-neutral-900">Novo pagamento</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="pay-student" className={labelClasses}>Aluno *</label>
                <select
                  id="pay-student"
                  className={inputClasses}
                  value={form.student_id}
                  onChange={(e) => set("student_id", e.target.value)}
                  required
                >
                  <option value="">Selecione o aluno...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {capitalizeName(s.name)}
                      {s.status === "inativo" ? " (inativo)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-date" className={labelClasses}>Vencimento *</label>
                  <DateInput
                    id="pay-date"
                    className={inputClasses}
                    value={form.due_date}
                    onChange={(v) => set("due_date", v)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pay-amount" className={labelClasses}>Valor (R$) *</label>
                  <input
                    id="pay-amount"
                    className={inputClasses}
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    placeholder="ex.: 350"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pay-method" className={labelClasses}>Método de pagamento</label>
                <select
                  id="pay-method"
                  className={inputClasses}
                  value={form.method}
                  onChange={(e) => set("method", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {Object.entries(METHOD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pay-notes" className={labelClasses}>Observações</label>
                <textarea
                  id="pay-notes"
                  rows={2}
                  className={inputClasses}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="opcional"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setForm(emptyForm);
                  setError(null);
                }}
                disabled={saving}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar pagamento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}