"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";
import DateInput from "@/components/DateInput";

/* ============================================================
   Aba Pagamentos — histórico financeiro do aluno no perfil
   ============================================================ */

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

type Payment = {
  id: string;
  due_date: string;
  amount: number;
  method: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
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
  const cancelado = status === "cancelado";
  const atrasado = !pago && !cancelado && dueDate && dueDate < todayISO();

  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
    atrasado: { label: "Atrasado", cls: "bg-red-100 text-red-800" },
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    cancelado: { label: "Cancelado", cls: "bg-neutral-100 text-neutral-500" },
  };

  const current = pago
    ? map.pago
    : cancelado
    ? map.cancelado
    : atrasado
    ? map.atrasado
    : map.pendente;

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${current.cls}`}>
      {current.label}
    </span>
  );
}

export default function PaymentsTab({ studentId }: { studentId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    due_date: todayISO(),
    amount: "",
    method: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .order("due_date", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setPayments((data ?? []) as Payment[]);
        setLoading(false);
      });
  }, [studentId, supabase]);

  async function markAsPaid(p: Payment) {
    const { error: err } = await supabase
      .from("payments")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", p.id);

    if (!err) {
      setPayments((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, status: "pago", paid_at: new Date().toISOString() }
            : x
        )
      );
      router.refresh();
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.due_date || !form.amount) {
      setError("Vencimento e valor são obrigatórios.");
      return;
    }

    setSaving(true);
    const { error: err } = await supabase.from("payments").insert({
      student_id: studentId,
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

    setForm({ due_date: todayISO(), amount: "", method: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    router.refresh();

    // Recarrega a lista
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .order("due_date", { ascending: false });
    if (data) setPayments(data as Payment[]);
  }

  // ===== Resumo =====
  let totalPago = 0;
  let aReceber = 0;
  let atrasados = 0;
  for (const p of payments) {
    if (p.status === "cancelado") continue;
    if (p.status === "pago") totalPago += p.amount;
    else {
      aReceber += p.amount;
      if (p.due_date < todayISO()) atrasados += p.amount;
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 rounded-xl bg-neutral-100" />
        <div className="h-40 rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo financeiro do aluno */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Total pago</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatMoney(totalPago)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">A receber</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{formatMoney(aReceber)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Atrasados</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{formatMoney(atrasados)}</p>
        </div>
      </div>

      {/* Cabeçalho + botão novo pagamento */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Histórico de pagamentos</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          {showForm ? "Cancelar" : "+ Novo pagamento"}
        </button>
      </div>

      {/* Formulário de novo pagamento */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-date" className={labelClasses}>Vencimento *</label>
              <DateInput
                id="pay-date"
                className={inputClasses}
                value={form.due_date}
                onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
                required
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
                required
              />
            </div>
            <div>
              <label htmlFor="pay-method" className={labelClasses}>Método</label>
              <select
                id="pay-method"
                className={inputClasses}
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {Object.entries(METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
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
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar pagamento"}
          </button>
        </form>
      )}

      {/* Lista de pagamentos */}
      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Nenhum pagamento registrado para este aluno.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-600">{formatDateBR(p.due_date)}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {p.method ? METHOD_LABELS[p.method] ?? p.method : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} dueDate={p.due_date} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "pago" && p.status !== "cancelado" ? (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}